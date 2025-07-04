const iconv = require('iconv-lite');

class EncodingHandler {
  constructor() {
    this.supportedEncodings = [
      'utf-8',
      'utf-16',
      'euc-kr',
      'euc-jp',
      'shift-jis',
      'gb2312',
      'big5',
      'iso-8859-1',
      'windows-1252'
    ];
    
    this.defaultEncoding = 'utf-8';
    this.encodingMap = new Map();
    this.initializeEncodingMap();
  }

  initializeEncodingMap() {
    this.encodingMap.set('korean', 'euc-kr');
    this.encodingMap.set('japanese', 'shift-jis');
    this.encodingMap.set('chinese-simplified', 'gb2312');
    this.encodingMap.set('chinese-traditional', 'big5');
    this.encodingMap.set('korean-utf8', 'utf-8');
    this.encodingMap.set('japanese-utf8', 'utf-8');
    this.encodingMap.set('chinese-utf8', 'utf-8');
  }

  encode(text, encoding = this.defaultEncoding) {
    try {
      if (!this.isEncodingSupported(encoding)) {
        console.warn(`Encoding ${encoding} not supported, using ${this.defaultEncoding}`);
        encoding = this.defaultEncoding;
      }

      if (encoding === 'utf-8') {
        return text;
      }

      const buffer = iconv.encode(text, encoding);
      return buffer;
    } catch (error) {
      console.error('Encoding error:', error);
      return text;
    }
  }

  decode(data, encoding = this.defaultEncoding) {
    try {
      if (!data) {
        return '';
      }

      if (typeof data === 'string') {
        return data;
      }

      if (!this.isEncodingSupported(encoding)) {
        console.warn(`Encoding ${encoding} not supported, using ${this.defaultEncoding}`);
        encoding = this.defaultEncoding;
      }

      if (encoding === 'utf-8') {
        return Buffer.isBuffer(data) ? data.toString('utf-8') : data;
      }

      const decoded = iconv.decode(data, encoding);
      return decoded;
    } catch (error) {
      console.error('Decoding error:', error);
      return data.toString();
    }
  }

  detectEncoding(buffer) {
    if (!buffer || buffer.length === 0) {
      return this.defaultEncoding;
    }

    const text = buffer.toString();
    
    if (this.isValidUTF8(buffer)) {
      return 'utf-8';
    }

    if (this.hasKoreanCharacters(text)) {
      return 'euc-kr';
    }

    if (this.hasJapaneseCharacters(text)) {
      return 'shift-jis';
    }

    if (this.hasChineseCharacters(text)) {
      return 'gb2312';
    }

    return this.defaultEncoding;
  }

  isValidUTF8(buffer) {
    try {
      const text = buffer.toString('utf-8');
      return Buffer.from(text, 'utf-8').equals(buffer);
    } catch (error) {
      return false;
    }
  }

  hasKoreanCharacters(text) {
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    return koreanRegex.test(text);
  }

  hasJapaneseCharacters(text) {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text);
  }

  hasChineseCharacters(text) {
    const chineseRegex = /[\u4E00-\u9FFF]/;
    return chineseRegex.test(text);
  }

  isEncodingSupported(encoding) {
    return this.supportedEncodings.includes(encoding.toLowerCase());
  }

  getSupportedEncodings() {
    return [...this.supportedEncodings];
  }

  getEncodingForLanguage(language) {
    const normalizedLanguage = language.toLowerCase();
    return this.encodingMap.get(normalizedLanguage) || this.defaultEncoding;
  }

  convertText(text, fromEncoding, toEncoding) {
    try {
      if (fromEncoding === toEncoding) {
        return text;
      }

      const buffer = this.encode(text, fromEncoding);
      return this.decode(buffer, toEncoding);
    } catch (error) {
      console.error('Text conversion error:', error);
      return text;
    }
  }

  processTerminalOutput(data, sessionEncoding = this.defaultEncoding) {
    try {
      let detectedEncoding = this.detectEncoding(data);
      
      if (sessionEncoding !== this.defaultEncoding) {
        detectedEncoding = sessionEncoding;
      }

      const decoded = this.decode(data, detectedEncoding);
      
      return {
        text: decoded,
        encoding: detectedEncoding,
        originalSize: data.length,
        processedSize: decoded.length
      };
    } catch (error) {
      console.error('Terminal output processing error:', error);
      return {
        text: data.toString(),
        encoding: this.defaultEncoding,
        originalSize: data.length,
        processedSize: data.length
      };
    }
  }

  validateEncoding(encoding) {
    return {
      isValid: this.isEncodingSupported(encoding),
      suggested: this.isEncodingSupported(encoding) ? encoding : this.defaultEncoding,
      supported: this.getSupportedEncodings()
    };
  }
}

function createEncodingHandler() {
  return new EncodingHandler();
}

module.exports = { createEncodingHandler, EncodingHandler };