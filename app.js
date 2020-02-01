// ==UserScript==
// @name         中文 gitHub
// @version      0.0.1
// @author       lin
// @license      MIT
// @match        *.github.com/*
// @require      https://52cik.github.io/github-hans/locals.js?v1.6.4
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function(window, document) {
  'use strict';

  var lang = 'zh'; // 中文

  function getPage() {
    // 先匹配 body 的 class
    var page = document.body.className.match(I18N.conf.rePageClass);

    if (!page) {
      // 扩展 url 匹配
      page = location.href.match(I18N.conf.rePageUrl);
    }

    if (!page) {
      // 扩展 pathname 匹配
      page = location.pathname.match(I18N.conf.rePagePath);
    }

    return page ? page[1] || 'homepage' : false; // 取页面 key
  }

  function transTitle() {
    var title = translate(document.title, 'title');

    if (title === false) {
      // 无翻译则退出
      return false;
    }

    document.title = title;
  }

  function timeElement() {
    if (!window.RelativeTimeElement) {
      // 防止报错
      return;
    }

    var RelativeTimeElement$getFormattedDate = RelativeTimeElement.prototype.getFormattedDate;
    var TimeAgoElement$getFormattedDate = TimeAgoElement.prototype.getFormattedDate;
    // var LocalTimeElement$getFormattedDate = LocalTimeElement.prototype.getFormattedDate;

    var RelativeTime = function(str, el) {
      // 相对时间解析
      if (/^on ([\w ]+)$/.test(str)) {
        return '于 ' + el.title.replace(/ .+$/, '');
      }

      // 使用字典公共翻译的第二个正则翻译相对时间
      var time_ago = I18N[lang].pubilc.regexp[1];
      return str.replace(time_ago[0], time_ago[1]);
    };

    RelativeTimeElement.prototype.getFormattedDate = function() {
      var str = RelativeTimeElement$getFormattedDate.call(this);
      return RelativeTime(str, this);
    };

    TimeAgoElement.prototype.getFormattedDate = function() {
      var str = TimeAgoElement$getFormattedDate.call(this);
      return RelativeTime(str, this);
    };

    LocalTimeElement.prototype.getFormattedDate = function() {
      return this.title.replace(/ .+$/, '');
    };

    // 遍历 time 元素进行翻译
    // 2016-04-16 github 改版，不再用 time 标签了。
    var times = document.querySelectorAll('time, relative-time, time-ago, local-time');
    Array.prototype.forEach.call(times, function(el) {
      if (el.getFormattedDate) {
        // 跳过未注册的 time 元素
        el.textContent = el.getFormattedDate();
      }
    });
  }

  function transElement(el, field, isAttr) {
    var transText = false; // 翻译后的文本

    if (isAttr === undefined) {
      // 非属性翻译
      transText = translate(el[field], page);
    } else {
      transText = translate(el.getAttribute(field), page);
    }

    if (transText === false) {
      // 无翻译则退出
      return false;
    }

    // 替换翻译后的内容
    if (isAttr === undefined) {
      el[field] = transText;
    } else {
      el.setAttribute(field, transText);
    }
  }

  function translate(text, page) {
    // 翻译
    var str;
    var _key = text.trim(); // 去除首尾空格的 key
    var _key_neat = _key
      .replace(/\xa0/g, ' ') // 替换 &nbsp; 空格导致的 bug
      .replace(/\s{2,}/g, ' '); // 去除多余换行空格等字符，(试验测试阶段，有问题再恢复)

    if (_key_neat === '') {
      return false;
    } // 内容为空不翻译

    str = transPage('pubilc', _key_neat); // 公共翻译

    if (str !== false && str !== _key_neat) {
      // 公共翻译完成
      str = transPage('pubilc', str) || str; // 二次公共翻译（为了弥补正则部分翻译的情况）
      return text.replace(_key, str); // 替换原字符，保留空白部分
    }

    if (page === false) {
      return false;
    } // 未知页面不翻译

    str = transPage(page, _key_neat); // 翻译已知页面
    if (str === false || str === '') {
      return false;
    } // 未知内容不翻译

    str = transPage('pubilc', str) || str; // 二次公共翻译（为了弥补正则部分翻译的情况）
    return text.replace(_key, str); // 替换原字符，保留空白部分
  }

  function transPage(page, key) {
    var str; // 翻译结果
    var res; // 正则数组

    // 静态翻译
    str = I18N[lang][page]['static'][key];
    if (str) {
      return str;
    }

    // 正则翻译
    res = I18N[lang][page].regexp;
    if (res) {
      for (var i = 0, len = res.length; i < len; i++) {
        str = key.replace(res[i][0], res[i][1]);
        if (str !== key) {
          return str;
        }
      }
    }

    return false; // 没有翻译条目
  }

  function walk(node) {
    var nodes = node.childNodes;

    for (var i = 0, len = nodes.length; i < len; i++) {
      var el = nodes[i];
      // todo 1. 修复多属性翻译问题; 2. 添加事件翻译, 如论预览信息;

      if (el.nodeType === Node.ELEMENT_NODE) {
        // 元素节点处理

        // 元素节点属性翻译
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          // 输入框 按钮 文本域
          if (el.type === 'button' || el.type === 'submit') {
            transElement(el, 'value');
          } else {
            transElement(el, 'placeholder');
          }
        } else if (el.hasAttribute('aria-label')) {
          // 带提示的元素，类似 tooltip 效果的
          transElement(el, 'aria-label', true);

          if (el.hasAttribute('data-copied-hint')) {
            // 复制成功提示
            transElement(el.dataset, 'copiedHint');
          }
        } else if (el.tagName === 'OPTGROUP') {
          // 翻译 <optgroup> 的 label 属性
          transElement(el, 'label');
        }

        if (el.hasAttribute('data-disable-with')) {
          // 按钮等待提示
          transElement(el.dataset, 'disableWith');
        }

        // 跳过 readme, 文件列表, 代码显示
        if (el.id !== 'readme' && !I18N.conf.reIgnore.test(el.className)) {
          walk(el); // 遍历子节点
        }
      } else if (el.nodeType === Node.TEXT_NODE) {
        // 文本节点翻译
        transElement(el, 'data');
      }
    }
  }

  var page = getPage();

  transTitle(); // 页面标题翻译

  timeElement(); // 时间节点翻译

  walk(document.body); // 立即翻译页面
})(window, document);
