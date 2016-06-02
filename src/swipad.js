/*!
 * TouchSlide v1.1
 * javascript触屏滑动特效插件，移动端滑动特效，触屏焦点图，触屏Tab切换，触屏多图切换等
 * 详尽信息请看官网：http://www.SuperSlide2.com/TouchSlide/
 *
 * Copyright 2013 大话主席
 *
 * 请尊重原创，保留头部版权
 * 在保留版权的前提下可应用于个人或商业用途

 * 1.1 宽度自适应（修复安卓横屏时滑动范围不变的bug）
 */
var TouchSlide = function(a) {

    a = a || {};
    var opts = {
      slideCell: a.slideCell || "#touchSlide", //运行效果主对象，必须用id！，例如 slideCell:"#touchSlide"
      titCell: a.titCell || ".hd li", // 导航对象，当自动分页设为true时为“导航对象包裹层”
      mainCell: a.mainCell || ".bd", // 切换对象包裹层
      effect: a.effect || "left", // 效果，支持 left、leftLoop
      autoPlay: a.autoPlay || false, // 自动播放
      delayTime: a.delayTime || 200, // 效果持续时间
      interTime: a.interTime || 2500, // 自动运行间隔
      defaultIndex: a.defaultIndex || 0, // 默认的当前位置索引。0是第一个； defaultIndex:1 时，相当于从第2个开始执行
      titOnClassName: a.titOnClassName || "on", // 当前导航对象添加的className
      autoPage: a.autoPage || false, // 自动分页，当为true时titCell为“导航对象包裹层”
      prevCell: a.prevCell || ".prev", // 前一页按钮
      nextCell: a.nextCell || ".next", // 后一页按钮
      pageStateCell: a.pageStateCell || ".pageState", // 分页状态对象，用于显示分页状态，例如：2/3
      pnLoop: a.pnLoop == 'undefined ' ? true : a.pnLoop, // 前后按钮点击是否继续执行效果，当为最前/后页是会自动添加“prevStop”/“nextStop”控制样色
      startFun: a.startFun || null, // 每次切换效果开始时执行函数，用于处理特殊情况或创建更多效果。用法 satrtFun:function(i,c){ }； 其中i为当前分页，c为总页数
      endFun: a.endFun || null, // 每次切换效果结束时执行函数，用于处理特殊情况或创建更多效果。用法 endFun:function(i,c){ }； 其中i为当前分页，c为总页数
      switchLoad: a.switchLoad || null //每次切换效果结束时执行函数，用于处理特殊情况或创建更多效果。用法 endFun:function(i,c){ }； 其中i为当前分页，c为总页数
    }

    var slideCell = document.getElementById(opts.slideCell.replace("#", ""));
    if (!slideCell) return false;


    //简单模拟jquery选择器
    var obj = function(str, parEle) {
        str = str.split(" ");
        var par = [];
        parEle = parEle || document;
        var retn = [parEle];
        for (var i in str) {
          if (str[i].length != 0) par.push(str[i])
        } //去掉重复空格
        for (var i in par) {
          if (retn.length == 0) return false;
          var _retn = [];
          for (var r in retn) {
            if (par[i][0] == "#") _retn.push(document.getElementById(par[i].replace("#", "")));
            else if (par[i][0] == ".") {
              var tag = retn[r].getElementsByTagName('*');
              for (var j = 0; j < tag.length; j++) {
                var cln = tag[j].className;
                if (cln && cln.search(new RegExp("\\b" + par[i].replace(".", "") + "\\b")) != -1) {
                  _retn.push(tag[j]);
                }
              }
            }
            else {
              var tag = retn[r].getElementsByTagName(par[i]);
              for (var j = 0; j < tag.length; j++) {
                _retn.push(tag[j])
              }
            }
          }
          retn = _retn;
        }

        return retn.length == 0 || retn[0] == parEle ? false : retn;
      } // obj E

    // 创建包裹层
    var wrap = function(el, v) {
      var tmp = document.createElement('div');
      tmp.innerHTML = v;
      tmp = tmp.children[0];
      var _el = el.cloneNode(true);
      tmp.appendChild(_el);
      el.parentNode.replaceChild(tmp, el);
      conBox = _el; // 重置conBox
      return tmp;
    };

    // 获取样色数值
    var getStyleVal = function(el, attr) {
      var v = 0;
      if (el.currentStyle) {
        v = el.currentStyle[attr]
      }
      else {
        v = getComputedStyle(el, false)[attr];
      }
      return parseInt(v.replace("px", ""))
    }

    // class处理
    var addClass = function(ele, className) {
      if (!ele || !className || (ele.className && ele.className.search(new RegExp("\\b" + className + "\\b")) != -1)) return;
      ele.className += (ele.className ? " " : "") + className;
    }

    var removeClass = function(ele, className) {
      if (!ele || !className || (ele.className && ele.className.search(new RegExp("\\b" + className + "\\b")) == -1)) return;
      ele.className = ele.className.replace(new RegExp("\\s*\\b" + className + "\\b", "g"), "");
    }

    //全局对象
    var effect = opts.effect;
    var prevBtn = obj(opts.prevCell, slideCell)[0];
    var nextBtn = obj(opts.nextCell, slideCell)[0];
    var pageState = obj(opts.pageStateCell)[0];
    var conBox = obj(opts.mainCell, slideCell)[0]; //内容元素父层对象
    if (!conBox) return false;
    var conBoxSize = conBox.children.length;
    var navObj = obj(opts.titCell, slideCell); //导航子元素结合
    var navObjSize = navObj ? navObj.length : conBoxSize;
    var sLoad = opts.switchLoad;

    /*字符串转换*/
    var index = parseInt(opts.defaultIndex);
    var delayTime = parseInt(opts.delayTime);
    var interTime = parseInt(opts.interTime);
    var autoPlay = (opts.autoPlay == "false" || opts.autoPlay == false) ? false : true;
    var autoPage = (opts.autoPage == "false" || opts.autoPage == false) ? false : true;
    var loop = (opts.pnLoop == "false" || opts.pnLoop == false) ? false : true;
    var oldIndex = index;
    var inter = null; // autoPlay的setInterval
    var timeout = null; // leftLoop的setTimeout
    var endTimeout = null; //translate的setTimeout

    var startX = 0;
    var startY = 0;
    var distX = 0;
    var distY = 0;
    var dist = 0; //手指滑动距离
    var isTouchPad = (/hp-tablet/gi).test(navigator.appVersion);
    var hasTouch = 'ontouchstart' in window && !isTouchPad;
    var touchStart = hasTouch ? 'touchstart' : 'mousedown';
    //var touchMove = hasTouch ? 'touchmove' : 'mousemove';
    var touchMove = hasTouch ? 'touchmove' : '';
    var touchEnd = hasTouch ? 'touchend' : 'mouseup';
    var slideH = 0;
    var slideW = conBox.parentNode.clientWidth; // mainCell滑动距离
    var twCell;
    var scrollY;
    var tempSize = conBoxSize;

    //处理分页
    if (navObjSize == 0) navObjSize = conBoxSize;
    if (autoPage) {
      navObjSize = conBoxSize;
      navObj = navObj[0];
      navObj.innerHTML = "";
      var str = "";

      if (opts.autoPage == true || opts.autoPage == "true") {
        for (var i = 0; i < navObjSize; i++) {
          str += "<li>" + (i + 1) + "</li>"
        }
      }
      else {
        for (var i = 0; i < navObjSize; i++) {
          str += opts.autoPage.replace("$", (i + 1))
        }
      }

      navObj.innerHTML = str;
      navObj = navObj.children; //重置navObj
    }



    if (effect == "leftLoop") {
      tempSize += 2;
      conBox.appendChild(conBox.children[0].cloneNode(true));
      conBox.insertBefore(conBox.children[conBoxSize - 1].cloneNode(true), conBox.children[0]);
    }
    twCell = wrap(conBox, '<div class="tempWrap" style="overflow:hidden; position:relative;"></div>');
    conBox.style.cssText = "width:" + tempSize * slideW + "px;" + "position:relative;overflow:hidden;";


    var doStartFun = function() {
      if (typeof opts.startFun == 'function') {
        opts.startFun(index, navObjSize)
      }
    }
    var doEndFun = function() {
      if (typeof opts.endFun == 'function') {
        opts.endFun(index, navObjSize)
      }
    }
    var doSwitchLoad = function(moving) {
        var curIndex = (effect == "leftLoop" ? index + 1 : index) + moving;
        var changeImg = function(ind) {
            var img = conBox.children[ind].getElementsByTagName("img");
            for (var i = 0; i < img.length; i++) {
              if (img[i].getAttribute(sLoad)) {
                img[i].setAttribute("src", img[i].getAttribute(sLoad));
                img[i].removeAttribute(sLoad);
              }
            }
          } // changeImg E
        changeImg(curIndex);
        if (effect == "leftLoop") {
          switch (curIndex) {
            case 0:
              changeImg(conBoxSize);
              break;
            case 1:
              changeImg(conBoxSize + 1);
              break;
            case conBoxSize:
              changeImg(0);
              break;
            case conBoxSize + 1:
              changeImg(1);
              break;
          }
        }
      } // doSwitchLoad E

    //动态设置滑动宽度
    var orientationChange = function() {
      slideW = twCell.clientWidth;
      conBox.style.width = tempSize * slideW + "px";
      for (var i = 0; i < tempSize; i++) {
        conBox.children[i].style.width = slideW + "px";
      }
      var ind = effect == "leftLoop" ? index + 1 : index;
      translate(-ind * slideW, 0);
    }
    window.addEventListener("resize", orientationChange, false);


    //滑动效果
    var translate = function(dist, speed, ele) {
      if (!!ele) {
        ele = ele.style;
      }
      else {
        ele = conBox.style;
      }
      ele.webkitTransitionDuration = ele.MozTransitionDuration = ele.msTransitionDuration = ele.OTransitionDuration = ele.transitionDuration = speed + 'ms';
      ele.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
      ele.msTransform = ele.MozTransform = ele.OTransform = 'translateX(' + dist + 'px)';
    }

    //效果函数
    var doPlay = function(isTouch) {

      switch (effect) {
        case "left":
          if (index >= navObjSize) {
            index = isTouch ? index - 1 : 0;
          }
          else if (index < 0) {
            index = isTouch ? 0 : navObjSize - 1;
          }
          if (sLoad != null) {
            doSwitchLoad(0)
          }
          translate((-index * slideW), delayTime);
          oldIndex = index;
          break;


        case "leftLoop":
          if (sLoad != null) {
            doSwitchLoad(0)
          }
          translate(-(index + 1) * slideW, delayTime);
          if (index == -1) {
            timeout = setTimeout(function() {
              translate(-navObjSize * slideW, 0);
            }, delayTime);
            index = navObjSize - 1;
          }
          else if (index == navObjSize) {
            timeout = setTimeout(function() {
              translate(-slideW, 0);
            }, delayTime);
            index = 0;
          }
          oldIndex = index;
          break; // leftLoop end

      } //switch end
      doStartFun();
      endTimeout = setTimeout(function() {
        doEndFun()
      }, delayTime);

      //设置className
      for (var i = 0; i < navObjSize; i++) {
        removeClass(navObj[i], opts.titOnClassName);
        if (i == index) {
          addClass(navObj[i], opts.titOnClassName)
        }
      }

      if (loop == false) { //loop控制是否继续循环
        removeClass(nextBtn, "nextStop");
        removeClass(prevBtn, "prevStop");
        if (index == 0) {
          addClass(prevBtn, "prevStop")
        }
        else if (index == navObjSize - 1) {
          addClass(nextBtn, "nextStop")
        }
      }
      if (pageState) {
        pageState.innerHTML = "<span>" + (index + 1) + "</span>/" + navObjSize;
      }

    }; // doPlay end

    //初始化执行
    doPlay();

    //自动播放
    if (autoPlay) {
      inter = setInterval(function() {
        index++;
        doPlay()
      }, interTime);
    }

    //点击事件
    if (navObj) {
      for (var i = 0; i < navObjSize; i++) {
        (function() {
          var j = i;
          navObj[j].addEventListener('click', function(e) {
            clearTimeout(timeout);
            clearTimeout(endTimeout);
            index = j;
            doPlay();
          })
        })()

      }
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        if (loop == true || index != navObjSize - 1) {
          clearTimeout(timeout);
          clearTimeout(endTimeout);
          index++;
          doPlay();
        }
      })
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        if (loop == true || index != 0) {
          clearTimeout(timeout);
          clearTimeout(endTimeout);
          index--;
          doPlay();
        }
      })
    }

    var scroll_top;

    //触摸开始函数
    var tStart = function(e) {
      scroll_top = $('body').scrollTop();
      clearTimeout(timeout);
      clearTimeout(endTimeout);
      scrollY = undefined;
      distX = 0;
      var point = hasTouch ? e.touches[0] : e;
      startX = point.pageX;
      startY = point.pageY;

      //添加“触摸移动”事件监听
      conBox.addEventListener(touchMove, tMove, false);
      //添加“触摸结束”事件监听
      conBox.addEventListener(touchEnd, tEnd, false);
    }

    //触摸移动函数
    var tMove = function(e) {
      var scroll_tops = 0;
      scroll_tops = $('body').scrollTop();
      if (scroll_tops == scroll_top) {
        if (hasTouch) {
          if (e.touches.length > 1 || e.scale && e.scale !== 1) return
        }; //多点或缩放

        var point = hasTouch ? e.touches[0] : e;
        distX = point.pageX - startX;
        distY = point.pageY - startY;

        if (typeof scrollY == 'undefined') {
          scrollY = !!(scrollY || Math.abs(distX) < Math.abs(distY));
        }
        if (!scrollY) {
          e.preventDefault();
          if (autoPlay) {
            clearInterval(inter)
          }
          switch (effect) {
            case "left":
              if ((index == 0 && distX > 0) || (index >= navObjSize - 1 && distX < 0)) {
                distX = distX * 0.4
              }
              translate(-index * slideW + distX, 0);
              break;
            case "leftLoop":
              translate(-(index + 1) * slideW + distX, 0);
              break;
          }

          if (sLoad != null && Math.abs(distX) > slideW / 3) {
            doSwitchLoad(distX > -0 ? -1 : 1)
          }
        }
      }
    }

    //触摸结束函数
    var tEnd = function(e) {
      if (distX == 0) return;
      e.preventDefault();
      if (!scrollY) {
        if (Math.abs(distX) > slideW / 10) {
          distX > 0 ? index-- : index++;
        }
        doPlay(true);
        if (autoPlay) {
          inter = setInterval(function() {
            index++;
            doPlay()
          }, interTime);
        }
      }

      conBox.removeEventListener(touchMove, tMove, false);
      conBox.removeEventListener(touchEnd, tEnd, false);
    }


    //添加“触摸开始”事件监听
    conBox.addEventListener(touchStart, tStart, false);


  } // TouchSlide E

/**
 * dropload
 * 西门(http://ons.me/526.html)
 * 0.9.0(160215)
 */

;
(function($) {
  'use strict';
  var win = window;
  var doc = document;
  var $win = $(win);
  var $doc = $(doc);
  $.fn.dropload = function(options) {
    return new MyDropLoad(this, options);
  };
  var MyDropLoad = function(element, options) {
    var me = this;
    me.$element = element;
    // 上方是否插入DOM
    me.upInsertDOM = false;
    // loading状态
    me.loading = false;
    // 是否锁定
    me.isLockUp = false;
    me.isLockDown = false;
    // 是否有数据
    me.isData = true;
    me._scrollTop = 0;
    me._threshold = 0;
    me.init(options);
  };

  // 初始化
  MyDropLoad.prototype.init = function(options) {
    var me = this;
    me.opts = $.extend(true, {}, {
      scrollArea: me.$element, // 滑动区域
      domUp: { // 上方DOM
        domClass: 'dropload-up',
        domRefresh: '<div class="dropload-refresh">↓下拉刷新</div>',
        domUpdate: '<div class="dropload-update">↑释放更新</div>',
        domLoad: '<div class="dropload-load"><span class="loading"></span>加载中...</div>'
      },
      domDown: { // 下方DOM
        domClass: 'dropload-down',
        domRefresh: '<div class="dropload-refresh">↑上拉加载更多</div>',
        domLoad: '<div class="dropload-load"><span class="loading"></span>加载中...</div>',
        domNoData: '<div class="dropload-noData">暂无数据</div>'
      },
      autoLoad: true, // 自动加载
      distance: 50, // 拉动距离
      threshold: '', // 提前加载距离
      loadUpFn: '', // 上方function
      loadDownFn: '' // 下方function
    }, options);

    // 如果加载下方，事先在下方插入DOM
    if (me.opts.loadDownFn != '') {
      me.$element.append('<div class="' + me.opts.domDown.domClass + '">' + me.opts.domDown.domRefresh + '</div>');
      me.$domDown = $('.' + me.opts.domDown.domClass);
    }

    // 计算提前加载距离
    if (!!me.$domDown && me.opts.threshold === '') {
      // 默认滑到加载区2/3处时加载
      me._threshold = Math.floor(me.$domDown.height() * 1 / 3);
    }
    else {
      me._threshold = me.opts.threshold;
    }

    // 判断滚动区域
    if (me.opts.scrollArea == win) {
      me.$scrollArea = $win;
      // 获取文档高度
      me._scrollContentHeight = $doc.height();
      // 获取win显示区高度  —— 这里有坑
      me._scrollWindowHeight = doc.documentElement.clientHeight;
    }
    else {
      me.$scrollArea = me.opts.scrollArea;
      me._scrollContentHeight = me.$element[0].scrollHeight;
      me._scrollWindowHeight = me.$element.height();
    }
    fnAutoLoad(me);

    // 窗口调整
    $win.on('resize', function() {
      if (me.opts.scrollArea == win) {
        // 重新获取win显示区高度
        me._scrollWindowHeight = win.innerHeight;
      }
      else {
        me._scrollWindowHeight = me.$element.height();
      }
    });

    // 绑定触摸
    me.$element.on('touchstart', function(e) {
      if (!me.loading) {
        fnTouches(e);
        fnTouchstart(e, me);
      }
    });
    me.$element.on('touchmove', function(e) {
      if (!me.loading) {
        fnTouches(e, me);
        fnTouchmove(e, me);
      }
    });
    me.$element.on('touchend', function() {
      if (!me.loading) {
        fnTouchend(me);
      }
    });

    // 加载下方
    me.$scrollArea.on('scroll', function() {
      me._scrollTop = me.$scrollArea.scrollTop();

      // 滚动页面触发加载数据
      if (me.opts.loadDownFn != '' && !me.loading && !me.isLockDown && (me._scrollContentHeight - me._threshold) <= (me._scrollWindowHeight + me._scrollTop)) {
        loadDown(me);
      }
    });
  };

  // touches
  function fnTouches(e) {
    if (!e.touches) {
      e.touches = e.originalEvent.touches;
    }
  }

  // touchstart
  function fnTouchstart(e, me) {
    me._startY = e.touches[0].pageY;
    // 记住触摸时的scrolltop值
    me.touchScrollTop = me.$scrollArea.scrollTop();
  }

  // touchmove
  function fnTouchmove(e, me) {
    me._curY = e.touches[0].pageY;
    me._moveY = me._curY - me._startY;

    if (me._moveY > 0) {
      me.direction = 'down';
    }
    else if (me._moveY < 0) {
      me.direction = 'up';
    }

    var _absMoveY = Math.abs(me._moveY);

    // 加载上方
    if (me.opts.loadUpFn != '' && me.touchScrollTop <= 0 && me.direction == 'down' && !me.isLockUp) {
      e.preventDefault();

      me.$domUp = $('.' + me.opts.domUp.domClass);
      // 如果加载区没有DOM
      if (!me.upInsertDOM) {
        me.$element.prepend('<div class="' + me.opts.domUp.domClass + '"></div>');
        me.upInsertDOM = true;
      }

      fnTransition(me.$domUp, 0);

      // 下拉
      if (_absMoveY <= me.opts.distance) {
        me._offsetY = _absMoveY;
        // todo：move时会不断清空、增加dom，有可能影响性能，下同
        me.$domUp.html(me.opts.domUp.domRefresh);
        // 指定距离 < 下拉距离 < 指定距离*2
      }
      else if (_absMoveY > me.opts.distance && _absMoveY <= me.opts.distance * 2) {
        me._offsetY = me.opts.distance + (_absMoveY - me.opts.distance) * 0.5;
        me.$domUp.html(me.opts.domUp.domUpdate);
        // 下拉距离 > 指定距离*2
      }
      else {
        me._offsetY = me.opts.distance + me.opts.distance * 0.5 + (_absMoveY - me.opts.distance * 2) * 0.2;
      }

      me.$domUp.css({
        'height': me._offsetY
      });
    }
  }

  // touchend
  function fnTouchend(me) {
    var _absMoveY = Math.abs(me._moveY);
    if (me.opts.loadUpFn != '' && me.touchScrollTop <= 0 && me.direction == 'down' && !me.isLockUp) {
      fnTransition(me.$domUp, 300);

      if (_absMoveY > me.opts.distance) {
        me.$domUp.css({
          'height': me.$domUp.children().height()
        });
        me.$domUp.html(me.opts.domUp.domLoad);
        me.loading = true;
        me.opts.loadUpFn(me);
      }
      else {
        me.$domUp.css({
          'height': '0'
        }).on('webkitTransitionEnd mozTransitionEnd transitionend', function() {
          me.upInsertDOM = false;
          $(this).remove();
        });
      }
      me._moveY = 0;
    }
  }

  // 如果文档高度不大于窗口高度，数据较少，自动加载下方数据
  function fnAutoLoad(me) {
    if (me.opts.autoLoad) {
      if ((me._scrollContentHeight - me._threshold) <= me._scrollWindowHeight) {
        loadDown(me);
      }
    }
  }

  // 重新获取文档高度
  function fnRecoverContentHeight(me) {
    if (me.opts.scrollArea == win) {
      me._scrollContentHeight = $doc.height();
    }
    else {
      me._scrollContentHeight = me.$element[0].scrollHeight;
    }
  }

  // 加载下方
  function loadDown(me) {
    me.direction = 'up';
    me.$domDown.html(me.opts.domDown.domLoad);
    me.loading = true;
    me.opts.loadDownFn(me);
  }

  // 锁定
  MyDropLoad.prototype.lock = function(direction) {
    var me = this;
    // 如果不指定方向
    if (direction === undefined) {
      // 如果操作方向向上
      if (me.direction == 'up') {
        me.isLockDown = true;
        // 如果操作方向向下
      }
      else if (me.direction == 'down') {
        me.isLockUp = true;
      }
      else {
        me.isLockUp = true;
        me.isLockDown = true;
      }
      // 如果指定锁上方
    }
    else if (direction == 'up') {
      me.isLockUp = true;
      // 如果指定锁下方
    }
    else if (direction == 'down') {
      me.isLockDown = true;
      // 为了解决DEMO5中tab效果bug，因为滑动到下面，再滑上去点tab，direction=down，所以有bug
      me.direction = 'up';
    }
  };

  // 解锁
  MyDropLoad.prototype.unlock = function() {
    var me = this;
    // 简单粗暴解锁
    me.isLockUp = false;
    me.isLockDown = false;
    // 为了解决DEMO5中tab效果bug，因为滑动到下面，再滑上去点tab，direction=down，所以有bug
    me.direction = 'up';
  };

  // 无数据
  MyDropLoad.prototype.noData = function(flag) {
    var me = this;
    if (flag === undefined || flag == true) {
      me.isData = false;
    }
    else if (flag == false) {
      me.isData = true;
    }
  };

  // 重置
  MyDropLoad.prototype.resetload = function() {
    var me = this;
    if (me.direction == 'down' && me.upInsertDOM) {
      me.$domUp.css({
        'height': '0'
      }).on('webkitTransitionEnd mozTransitionEnd transitionend', function() {
        me.loading = false;
        me.upInsertDOM = false;
        $(this).remove();
        fnRecoverContentHeight(me);
      });
    }
    else if (me.direction == 'up') {
      me.loading = false;
      // 如果有数据
      if (me.isData) {
        // 加载区修改样式
        me.$domDown.html(me.opts.domDown.domRefresh);
        fnRecoverContentHeight(me);
        fnAutoLoad(me);
      }
      else {
        // 如果没数据
        me.$domDown.html(me.opts.domDown.domNoData);
      }
    }
  };

  // css过渡
  function fnTransition(dom, num) {
    dom.css({
      '-webkit-transition': 'all ' + num + 'ms',
      'transition': 'all ' + num + 'ms'
    });
  }
})(window.Zepto || window.jQuery);


/**
 * swipad
 * 修复url带有参数时被覆盖问题
 * v0.3.2
 */

var itemIndex = 0,
  swpAjaxIndex = 0,
  swpAjaxAllow = true,
  swiperLoad,
  dropload;
$(function() {
  swiperLoad = (function(obj) {
    var firest = false,
      reg = /\-?[0-9]+\.?[0-9]*/g,
      winHeight = window.innerHeight,
      winWidth = window.innerWidth,
      //转跳后返回tab不变
      url_ = window.location.href,
      loc = parseInt(url_.substring(url_.lastIndexOf('#') + 11, url_.length));
    obj.defaultIndex = typeof(loc) == "number" ? loc : 0;
    //参数
    var defaults = {
      swipadNav: null, //导航栏元素：数组
      swipadView: null, //导航栏最大显示个数： 数字
      navSlide: true,
      titOnClassName: 'on',
      defaultIndex: defaultIndex, //默认初始化加载第几个tab：数字 （暂不开放）
      searchClean: undefined, //搜索清除：fn
      autoLoad: true, //dropload初始化是否自动加载：boolean
      siblings: null, //除去#swp_以外的非固定定位的元素
      resetSearch: false, //滑动后是否清除搜索内容，并重新加载内容：boolean
      noDataTips: '暂无数据', //无数据时的展示
      domDown: ['上拉加载更多', '加载中...', '没有更多的内容了...'], //dropload提示内容
      loadDownFn: undefined, //加载内容的方法：fn
      slideSn: undefined, //滑动前动作：fn
      slideEn: undefined //滑动后动作：fn
    };
    //初始化方法
    obj.init = function(params) {
      params = $.extend({}, defaults, params);
      createSwipad(params);
      setTimeout(function() {
        touchSwipad(params);
      }, 100);
      setTimeout(function() {
        droad(params);
        firest = true;
      }, 200);
    };

    //创建html元素
    function createSwipad(params) {
      //依赖css
      var style = '<style>' +
        '.swp-nav {overflow: hidden}' +
        '.swp-gate {display: -webkit-box;display: -webkit-flex;display: flex}' +
        '.swp-cell {display: block;-webkit-box-flex: 1;-webkit-flex: 1;flex: 1;width: 1px}' +
        '.swp-main {display: -webkit-box;display: -webkit-flex;display: flex}' +
        '.swp-item {-webkit-box-flex: 1;-webkit-flex: 1;flex: 1;width: 1px}';
      '</style>';
      var $swiperLoadHtml = $('<div><div class="swp-nav"><div class="swp-gate"></div></div><div class="swp-main"></div></div>');
      for (var i in params.swipadNav) {
        var $nodata = $('<div class="swp-nodata" style="display:none" ><p class="notext">' + params.noDataTips + '</p></div>');
        var $div = $('<div id="swp_' + i + '" class="swp-item"><div class="swp-cont"></div></div>');
        var $a = $('<a class="swp-cell">' + params.swipadNav[i] + '</a>');
        $div.find('.swp-cont').after($nodata);
        $swiperLoadHtml.find('.swp-gate').append($a);
        $swiperLoadHtml.find('.swp-main').append($div);
      };
      $('#swipad').append(style, $swiperLoadHtml.html());
      navSlide(params);
    };

    //滑动方法
    function touchSwipad(params) {
      TouchSlide({
        slideCell: "#swipad", //最外层id
        titCell: ".swp-nav a", //导航
        mainCell: ".swp-main", //主体
        titOnClassName: params.titOnClassName,
        defaultIndex: params.defaultIndex,
        startFun: function(i) {
          itemIndex = i //判定是哪一个激活窗口
          params.slideSn && params.slideSn();
          params.searchClean && params.searchClean();
          navAuto('.swp-cell', i); //导航跟随内容滚动
          swpTop(i, params); //每次滑动后返回顶部
        },
        endFun: function(i) {
          if ('pushState' in history) {
            history.state = null;
            var stateObject = {
              id: i
            };
            var title = i;
            var newUrl = window.location.href;
            newUrl = newUrl.substring(0, url_.lastIndexOf('#')) + '#itemIndex_' + i;
            history.replaceState(stateObject, title, newUrl);
          };
          if (swpAjaxAllow) {
            swpAjaxIndex = i;
            swpAjaxAllow = false;
          };
          if ($('#swp_' + i).find('.swp-cont').children().length > 0) {
            swpAjaxAllow = true;
          }
          params.slideEn && params.slideEn();
          params.resetSearch && resetSearch(params);
          //重新获取高度
          resetHeight(params);
          firest && unlock_(); //dropload判断是否解锁
        }
      });
    };

    //tab搜索后切换回来重新加载正常数据
    function resetSearch(params) {
      if ($('#swp_' + itemIndex).attr('searched')) {
        $('#swp_' + itemIndex).children().eq(1).hide();
        $('#swp_' + itemIndex).children().eq(2).show();
        $('#swp_' + itemIndex).removeAttr('searched').removeAttr('counter').removeAttr('loaded');
      };
    };

    //滑动结束后返回页面顶部
    var swpIndex = 0;

    function swpTop(index, params) {
      if (swpIndex != index) {
        var height = winHeight;
        if (params.siblings != null) {
          for (var i in params.siblings) {
            height -= $(params.siblings[i]).height();
          };
        };
        swpIndex = index;
        $('.swp-main').parent().css('height', height);
      };
    };

    //上拉加载方法
    function droad(params) {
      dropload = $('.swp-item').dropload({
        scrollArea: window,
        domDown: {
          domClass: 'dropload-down',
          domRefresh: '<div class="dropload-refresh">' + params.domDown[0] + '</div>',
          domLoad: '<div class="dropload-load"><span class="loading"></span>' + params.domDown[1] + '</div>',
          domNoData: '<div class="dropload-noData">' + params.domDown[2] + '</div>'
        },
        autoLoad: params.autoLoad,
        loadDownFn: function(me) {
          params.loadDownFn(me, params);
        }
      });
    };

    obj.error = function(me, params, tabId) {
      me.lock();
      me.noData(true);
      swiperLoad.resetHeight(params);
      me.resetload();
      $(tabId).find('.dropload-noData').html('网络错误，请检查网络连接后刷新本页！');
      var count = parseInt($(tabId).attr('counter')) - 1;
      $(tabId).attr('counter', count);
    };

    //高度重加载
    resetHeight = function(params) {
      var justHeight = 0;
      var otherHeight = parseInt($('#swp_' + itemIndex).css('margin-top')) + parseInt($('#swp_' + itemIndex).css('margin-bottom')) + parseInt($('#swp_' + itemIndex).css('padding-top')) + parseInt($('#swp_' + itemIndex).css('padding-bottom'));
      var contHeight = $('#swp_' + itemIndex).children().eq(0).height() + $('#swp_' + itemIndex).children().eq(2).height();
      if (params.siblings != null) {
        for (var i in params.siblings) {
          justHeight += $(params.siblings[i]).height();
        };
      };
      var height = otherHeight + contHeight + justHeight <= winHeight ? (winHeight - justHeight) : (otherHeight + contHeight);
      $('.swp-main').parent().css('height', height);
    };

    //nav auto transform
    var checkLR = 0;

    function navAuto(children, i) {
      var maxLength = childLength - cou;
      var maxTrans = -(maxLength * childrenWidth);
      var wrap = document.querySelector(children).parentNode;
      if (checkLR < i) {
        //向右
        var transformss = -(childrenWidth * i - childrenWidth);
        if (transformss < maxTrans) {
          transformss = maxTrans
        };
        wrap.style.WebkitTransform = 'translate3d(' + transformss + 'px, 0, 0)';
        wrap.style.transform = 'translate3d(' + transformss + 'px, 0, 0)';
      }
      else {
        //向左
        var transforms = -(childrenWidth * i - childrenWidth);
        if (transforms > 0) {
          transforms = 0
        }
        if (transforms <= maxTrans) {
          transforms = maxTrans
        };
        wrap.style.WebkitTransform = 'translate3d(' + transforms + 'px, 0, 0)';
        wrap.style.transform = 'translate3d(' + transforms + 'px, 0, 0)';
      }
      Translate = wrap.style.transform ? parseInt(wrap.style.transform.match(reg)[1]) : 0;
      checkLR = i;
    }

    //nav width
    var childrenWidth


    //nav
    var transformWidth, childLength, cou;
    var Translate = 0;

    function navSlide(params) {
      var count = 4;
      if (params.swipadView) {
        count = params.swipadView;
      };
      childLength = $('.swp-gate').children().length;
      cou = childLength < count ? childLength : count;
      childrenWidth = winWidth / cou;
      var navWidth = childrenWidth * childLength;
      $('.swp-gate').css('width', navWidth);
      var startPosition, endPosition, TranslateMonitor;
      var wrap = document.querySelector('.swp-gate');
      var parent = wrap.parentNode;
      transformWidth = -(navWidth - winWidth);
      var transWidth = transformWidth - winWidth / 3;
      //写入各种style
      wrap.style.WebkitTransitionDuration = '.2s';
      //wrap.style.MozTransitionDuration = '.2s';
      wrap.style.transitionDuration = '.2s';
      wrap.style.WebkitTransform = 'translate3d(0, 0, 0)';
      //wrap.style.MozTransform = 'translate3d(0, 0, 0)';
      wrap.style.transform = 'translate3d(0, 0, 0)';
      parent.addEventListener('touchstart', function(event) {
        //取消过渡效果
        wrap.style.WebkitTransitionDuration = '0s';
        //wrap.style.MozTransitionDuration = '0s';
        wrap.style.transitionDuration = '0s';
        var touch = event.touches[0];
        startPosition = {
          x: touch.pageX,
          y: touch.pageY
        };
      });
      //移动
      parent.addEventListener('touchmove', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var touch = event.touches[0];
        endPosition = {
          x: touch.pageX,
          y: touch.pageY
        }
        var deltaX = endPosition.x - startPosition.x;
        var deltaY = endPosition.y - startPosition.y;
        var moveLength = parseInt(Math.sqrt(Math.pow(Math.abs(deltaX), 2) + Math.pow(Math.abs(deltaY), 2)));
        TranslateMonitor = wrap.style.transform ? wrap.style.transform.match(reg)[1] : 0;
        if (deltaX > 0) {
          //向左
          if (TranslateMonitor < winWidth / 3) {
            moveLength = Translate + moveLength;
            wrap.style.WebkitTransform = 'translate3d(' + moveLength + 'px, 0, 0)';
            //wrap.style.MozTransform = 'translate3d(' + moveLength + 'px, 0, 0)';
            wrap.style.transform = 'translate3d(' + moveLength + 'px, 0, 0)';
          };
        }
        else {
          //向右
          if (TranslateMonitor > transWidth) {
            moveLength = Translate - moveLength;
            wrap.style.WebkitTransform = 'translate3d(' + moveLength + 'px, 0, 0)';
            //wrap.style.MozTransform = 'translate3d(' + moveLength + 'px, 0, 0)';
            wrap.style.transform = 'translate3d(' + moveLength + 'px, 0, 0)';
          };
        };
      });
      //触控结束
      parent.addEventListener('touchend', function(event) {
        Translate = wrap.style.transform ? parseInt(wrap.style.transform.match(reg)[1]) : 0;
        wrap.style.WebkitTransitionDuration = '.2s';
        //wrap.style.MozTransitionDuration = '.2s';
        wrap.style.transitionDuration = '.2s';
        if (Translate > 0) {
          //过度左，回弹
          //添加过渡
          wrap.style.WebkitTransform = 'translate3d(0, 0, 0)';
          //wrap.style.MozTransform = 'translate3d(0, 0, 0)';
          wrap.style.transform = 'translate3d(0, 0, 0)';
          Translate = 0;
        }
        else if (Translate < transformWidth) {
          //过度右，回弹
          //添加过渡
          wrap.style.WebkitTransform = 'translate3d(' + transformWidth + 'px, 0, 0)';
          //wrap.style.MozTransform = 'translate3d(' + transformWidth + 'px, 0, 0)';
          wrap.style.transform = 'translate3d(' + transformWidth + 'px, 0, 0)';
          Translate = transformWidth;
        };
      });
    };

    //下拉加载加解锁判定
    function unlock_() {
      //判定
      if (!$('#swp_' + itemIndex).attr('loaded')) {
        // 解锁
        dropload.unlock();
        dropload.noData(false);
      }
      else {
        // 锁定
        dropload.lock();
        dropload.noData();
      }
      // 重置
      dropload.resetload();
    };

    return obj;
  })(this);
});


//nodata展示
function noData(obj) {
  $('#swp_' + itemIndex).attr('loaded', true);
  // 锁定
  obj.lock();
  // 无数据
  obj.noData();
  obj.resetload();
  if ($('#swp_' + itemIndex).find('.swp-cont').children().length == 0) {
    $('#swp_' + itemIndex).children().eq(1).show();
    $('#swp_' + itemIndex).children().eq(2).hide();
  };
};





/*轮子*/

String.prototype.temp = function(obj) {
  return this.replace(/\$\w+\$/gi, function(matchs) {
    var returns = obj[matchs.replace(/\$/g, "")];
    return (returns + "") == "undefined" ? "" : returns;
  });
};
