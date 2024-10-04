let speechRec;
let phrases = [];
const recognitionDuration = 7000;
const fadeDuration = 50000;
const maxPhrases = 20;  // Максимальное количество фраз на экране
let isRecognizing = false;
const frameSize = 100;
const occupiedAreas = [];
const baseWidth = 1280;  // Базовая ширина
const baseHeight = 720;  // Базовая высота
const baseFontSize = 18;  // Базовый размер шрифта при 1280x720
const baseLineHeight = 20;  // Базовое расстояние между строками (межстрочный интервал)
let lineHeight;  // Переменная для хранения текущего расстояния между строками

function setup() {
  createCanvas(windowWidth, windowHeight);  // Устанавливаем холст на весь экран
  noStroke();
  background(0);

  speechRec = new p5.SpeechRec('ru-RU', gotSpeech);
  speechRec.interimResults = false;
  speechRec.onEnd = restartRecognition;

  startRecognition();

  adjustTextSize();  // Масштабируем текст
  fill(255);
}

// Включаем или отключаем полноэкранный режим по нажатию клавиши "F"
function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = fullscreen();
    fullscreen(!fs);  // Переключаем полноэкранный режим
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);  // Подгоняем холст под новый размер окна
  adjustTextSize();  // Масштабируем текст при изменении размеров окна
}

function adjustTextSize() {
  // Рассчитываем масштабирование относительно базового разрешения
  let scaleFactorWidth = width / baseWidth;  // Используем ширину для масштабирования
  let scaleFactorHeight = height / baseHeight;  // Используем высоту для масштабирования

  let scaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);  // Выбираем минимальный масштаб

  textSize(baseFontSize * scaleFactor);  // Масштабируем размер шрифта
  lineHeight = baseLineHeight * scaleFactor;  // Масштабируем расстояние между строками
}

function draw() {
  background(0);

  for (let i = phrases.length - 1; i >= 0; i--) {
    let phrase = phrases[i];

    fill(255, 255, 255, phrase.alpha);
    if (phrase.type === 'speech') {
      textAlign(LEFT, CENTER);
    } else if (phrase.type === 'generated') {
      textAlign(RIGHT, CENTER);
    }

    for (let j = 0; j < phrase.lines.length; j++) {
      text(phrase.lines[j].toLowerCase(), phrase.x, phrase.y + j * lineHeight);  // Используем lineHeight для расстояния между строками
    }

    // Уменьшение альфа-канала
    phrase.alpha -= 178 / (fadeDuration / 1000 * frameRate());

    if (phrase.alpha <= 25) {
      phrase.alpha = 25;
    }
  }

  // Если фраз больше 20, удаляем первую
  if (phrases.length > maxPhrases) {
    phrases.shift();  // Удаляем самую старую фразу
  }
}

async function gotSpeech() {
  if (speechRec.resultValue) {
    let words = speechRec.resultString.split(' ');
    let groupedLines = splitIntoLines(words);

    let phraseObject = {
      lines: groupedLines,
      x: 0,
      y: 0,
      alpha: 255,
      type: 'speech'
    };

    findValidPosition(phraseObject);
    phrases.push(phraseObject);
    
    // Проверяем количество фраз и удаляем лишние
    if (phrases.length > maxPhrases) {
      phrases.shift();
    }
    
    let generatedPoem = await requestPoem(speechRec.resultString);
    if (generatedPoem) {
      let poemWords = generatedPoem.split(' ');
      let poemLines = splitIntoLines(poemWords);

      let generatedPhraseObject = {
        lines: poemLines,
        x: 0,
        y: 0,
        alpha: 255,
        type: 'generated'
      };

      findValidPosition(generatedPhraseObject);
      phrases.push(generatedPhraseObject);

      // Проверяем количество фраз и удаляем лишние
      if (phrases.length > maxPhrases) {
        phrases.shift();
      }
    }
  }

  restartRecognition();
}

function findValidPosition(phraseObject) {
  let validPositionFound = false;
  let attempts = 0;

  while (!validPositionFound && attempts < 100) {
    let x = random(frameSize, width - frameSize);
    let y = random(frameSize, height - frameSize);

    if (!isPositionOccupied(x, y, phraseObject.lines.length)) {
      phraseObject.x = x;
      phraseObject.y = y;
      occupiedAreas.push({ x, y, height: phraseObject.lines.length * 20 });
      validPositionFound = true;
    }

    attempts++;
  }
}

function isPositionOccupied(x, y, lineCount) {
  for (let area of occupiedAreas) {
    if (x < area.x + 100 && x + 100 > area.x &&
        y < area.y + area.height && y + lineCount * 20 > area.y) {
      return true;
    }
  }
  return false;
}

function splitIntoLines(words) {
  let groupedLines = [];
  let currentIndex = 0;

  while (currentIndex < words.length) {
    let numWords = Math.floor(Math.random() * 4) + 1;
    let lineWords = words.slice(currentIndex, currentIndex + numWords).join(' ');
    groupedLines.push(lineWords);
    currentIndex += numWords;
  }

  return groupedLines;
}

function startRecognition() {
  if (!isRecognizing) {
    isRecognizing = true;
    speechRec.start();

    setTimeout(() => {
      stopRecognition();
    }, recognitionDuration);
  }
}

function stopRecognition() {
  if (isRecognizing) {
    speechRec.stop();
    isRecognizing = false;
  }
}

function restartRecognition() {
  stopRecognition();
  setTimeout(() => {
    startRecognition();
  }, 100);
}

async function requestPoem(speech) {
  const apiKey = '3pqdV38WnPZ75Qo0aqhIKdDH4bpsSNV3';  // Замените на ваш API-ключ
  const apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  const promptText = `Ответь одной поэтической строчкой. Поэзия на тему: "${speech}"`;  // Используем обратные кавычки

  const requestBody = {
    model: 'open-mistral-nemo',  // Модель, которую нужно использовать
    messages: [{role: 'user', content: promptText}],
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // Здесь также нужно использовать обратные кавычки для корректной интерполяции
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  };

  try {
    let response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    let data = await response.json();
    let generatedText = data?.choices[0]?.message?.content;

    if (generatedText) {
      return generatedText.replace(/[«»'"“”—.–:;\n]/g, '').trim().toLowerCase();
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}