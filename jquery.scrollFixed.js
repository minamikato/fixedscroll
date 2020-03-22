/**
 * scrollFixed – `position: sticky` polyfill
 * 
 * @author Minami K.
 * @version 1.0.0
 * @licensed MIT license
 */

(function ($) {
    //メソッド呼び出し
    $.fn.scrollFixed = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.scrollFixed');
        }
    };
    //デフォルト設定値
    $.fn.scrollFixed.defaults = {
        debug: false,
        stickyCss: 'scrollFixed',
        spacer:true,
        spacerCss: 'spacer',
        parentWidth: null,
        important: false,

        // Callbacks
        stickyStart: null,
        stickyEnd: null,
    };

    //スクロールディレイ(ms)
    $.fn.scrollFixed.scrollDelay = 200;

    //リサイズディレイ(ms)
    $.fn.scrollFixed.resizeDelay = 200;

    //stickyたち
    var stickies = [];
    //stickyの親たち
    var stickyParents = [];

    //windowのresizeイベント処理用のタイマー
    var resizeTimer = null;

    //stickyをサポートするブラウザかをチェック
    //※stickyをサポートするブラウザの場合は場合はブラウザのposition:stickyを使用する。
    //  scrollFixedで処理するにはオプションでimportant:trueを指定する。
    //thanks!：https://github.com/wilddeer/stickyfill
    var stickySupports = false;

    (function () {
        var testNode = $('<div />');

        if (['', '-webkit-', '-moz-', '-ms-'].some(function (prefix) {
            try {
                testNode.css('position', prefix + 'sticky');
            } catch (e) { }

            return testNode.css('position').indexOf('sticky') != -1;
        })) stickySupports = true;
    })();

    /**
     * ウィンドウのリサイズ時に幅を合わせる処理
     */
    function windowResize() {

        if (resizeTimer) return;

        resizeTimer = setTimeout(function () {
            methods.resize();
            resizeTimer = null;
        }, $.fn.scrollFixed.resizeDelay);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //ユーティリティ

    /**
     * 数値変換(失敗したら0)
     * @param {any} value
     */
    function parseNumeric(value) {
        return parseFloat(value) || 0;
    }

    /**
     * stickyParentsを検索・作成
     * @param {HTMLElement} child この要素に対する親を作成する
     */
    function findParent(child) {
        var parentCtrl = _getScrollableParent(child);

        var arr = stickyParents.filter(function (x) {
            return x.equals(parentCtrl);
        });

        if (arr.length > 0) return arr[0];

        var parent = new StickyParent(parentCtrl);
        stickyParents.push(parent);
        return parent;
    }

    /**
     * この要素の作成済のStickyインスタンスを返却。
     * @param {HTMLElement|jQuery} ctrl スクロール位置を固定する要素
     * @returns {Sticky} 作成済のStickyインスタンス。未作成の場合はundefined
     */
    function find(ctrl) {
        var arr = stickies.filter(function (x) {
            if (x.$ctrl != null && x.$ctrl.is(ctrl)) return true;
        });

        if (arr.length == 0) return undefined;

        return arr[0];
    }

    /**
     * スクロール可能な親を取得
     * @param {HTMLElement} node 親を探す対象コントロール
     * @return {HTMLElement|Window} スクロール可能に指定された親コントロール
     */
    function _getScrollableParent(node) {
        var tagName = (node && node.tagName ? node.tagName.toLowerCase() : "");
        if (node == null || tagName == 'html' || tagName == 'body') {
            return window;
        }

        var overflow = $(node).css('overflow-y');
        if (overflow == 'scroll') {
            return node;
        }
        if (overflow == 'auto' && node.scrollHeight > node.offsetHeight) {
            return node;
        }

        return _getScrollableParent(node.parentNode);
    }

    function _getScollableParents(node) {
        var list = [];
        var target = node;

        while (target && target != window) {

            var parent = _getScrollableParent(target);
            list.push(parent);

            target = parent.parentNode;
        }

        return list;
    }
    function equals(obj1, obj2, windowEqualsBody) {

        var elm1 = obj1;
        if (obj1 instanceof jQuery) elm1 = obj1[0];

        var elm2 = obj2;
        if (obj2 instanceof jQuery) elm2 = obj2[0];

        if (elm1 == elm2) return true;

        if (!windowEqualsBody) return false;

        var win1 = elm1 == window || elm1 == document.body;
        var win2 = elm2 == window || elm2 == document.body;

        return win1 == win2;
    }

    function add(cssText, num) {
        if (cssText == 'auto') return cssText;

        return parseNumeric(cssText) + num;
    }
    function isActive($obj, perfect) {
        var rect = $obj[0].getBoundingClientRect();

        var et = ~~(rect.top || 0);
        var eh = ~~($obj.outerHeight() || 0);

        $obj.attr('data-et', et);

        var $parent = $obj.parent();

        var pt, ph;
        if ($parent[0].tagName.toLowerCase() == 'body') {
            pt = 0;
            ph = $(window).height();

        } else {
            var parentRect = $parent[0].getBoundingClientRect();
            pt = parentRect.top;
            ph = $parent.outerHeight();
        }

        if (perfect) {
            return (pt <= et && (et + eh) <= (pt + ph));
        }
        else if ((et + eh) >= pt && et <= (pt + ph)) {
            return true;
        }

        return false;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * スタイルの設定値を保持しておくためのクラス
     */
    var StyleInfo = (function () {

        var properties = ['position', 'top', 'bottom', 'left', 'width', 'height', 'marginTop', 'marginBottom'
            , 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'];

        var StyleInfo = function (elm) {
            var current = this;

            current.styles = {};
            current.computed = {};

            if (elm instanceof jQuery && elm.length > 0) {
                current.element = elm[0];
                current.$element = elm;
            }
            else if (elm instanceof HTMLElement) {
                current.element = elm;
                current.$element = $(elm);
            }
            else {
                properties.forEach(function (value, index) {
                    current[value] = 0;
                });
                return;
            }

            var computedStyles = getComputedStyle(current.element);

            properties.forEach(function (value, index) {
                //適用されているスタイル
                current.computed[value] = computedStyles[value];
                current[value] = parseNumeric(computedStyles[value]);

                //この要素に指定されているスタイル
                current.styles[value] = current.element.style[value];
            });

            var rect = current.element.getBoundingClientRect();
            current.offsetTop = rect.top;
            current.offsetLeft = rect.left;
        }

        StyleInfo.prototype.reset = function () {
            var current = this;

            if (!current.element) return;

            properties.forEach(function (value, index) {
                current.element.style[value] = current.styles[value];
            });
        }
        StyleInfo.prototype.getOffset = function () {
            var result = {
                top: 0,
                left: 0,
                height: 0,
                innerHeight: 0,
                offsetTop: 0,
                offsetLeft: 0
            };

            if (!this.element) return result;

            var rec = this.element.getBoundingClientRect();

            result.top = rec.top + parseNumeric(this.$element.css('border-top-width'));
            result.left = rec.left + parseNumeric(this.$element.css('border-left-width'));
            result.height = rec.height;
            result.innerHeight = this.$element.height();
            result.offsetTop = this.element.offsetTop;
            result.offsetLeft = this.element.offsetLeft;

            return result
        }

        return StyleInfo;
    })();

    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * stickyの親を扱うクラス
     */
    var StickyParent = (function () {

        var _events = [];

        function callScroll(sender, overflowMode) {
            for (var i = 0; i < _events.length; i++) {
                if (equals(_events[i].key, sender) == false) continue;

                _events[i].behavior._callScroll.apply(_events[i].behavior, [overflowMode]);
            }
        }

        var StickyParent = function (parent) {
            this.fixedTimerId = null;
            this.enabled = false;

            this.$parent = $(parent);
            this.isWindow = this.$parent.length > 0 && this.$parent[0] == window;
            this.$parentObj = this.isWindow ? $(document.body) : this.$parent;

            this.parents = _getScollableParents(this.$parentObj[0]);

            this.stickies = [];
        }

        StickyParent.prototype.add = function (sticky) {

            var parent = this;

            this.stickies.push(sticky);

            if (!this.enabled) {
                //親コンテナのスクロールイベントを設定
                this.$parent.off('scroll.scrollFixed');
                this.$parent.on('scroll.scrollFixed', function () { callScroll(this); });

                _events.push({ key: this.$parent, behavior: parent });

                this.enabled = true;

                //親にさかのぼってイベント設定
                for (var i = 0; i < this.parents.length; i++) {
                    var $p = $(this.parents[i]);
                    $p.off('scroll.scrollFixedOverflow');
                    $p.on('scroll.scrollFixedOverflow', function () { callScroll(this, true); });

                    _events.push({ key: $p, behavior: parent });
                }
            }
        }

        StickyParent.prototype.remove = function (sticky) {
            //親から削除
            this.stickies = this.stickies.filter(function (x) {
                return x != sticky;
            });

            if (this.stickies.length == 0) {
                //イベント停止
                this._clearTimer();
                this.enabled = false;
            }
        }

        StickyParent.prototype.scrollTop = function () {
            return this.$parent.scrollTop();
        }

        StickyParent.prototype.scroll = function () {
            this.$parent.trigger('scroll.scrollFixed');
        }

        /**
         * スクロールイベントを処理(呼び出し部)
         */
        StickyParent.prototype._callScroll = function (overflowMode) {

            var parent = this;

            if (this.stickies.length.length == 0) {
                this._clearTimer();
                return;
            }

            if (this.fixedTimerId) return;

            this.fixedTimerId = setTimeout(function () {
                var scrollTop = parent.scrollTop();
                for (var i = 0; i < parent.stickies.length; i++) {

                    var sticky = parent.stickies[i];

                    sticky._scroll(scrollTop);
                }

                parent._clearTimer();
            }, $.fn.scrollFixed.scrollDelay);
        }
        StickyParent.prototype._clearTimer = function () {

            if (!this.fixedTimerId) return;

            clearInterval(this.fixedTimerId);
            this.fixedTimerId = null;
        }
        StickyParent.prototype.equals = function (obj) {
            return equals(this.$parent, obj);
        }
        StickyParent.prototype.getOffset = function () {
            //var rec = this.$parentObj[0].getBoundingClientRect();

            //return {
            //    top: rec.top + parseNumeric(this.$parentObj.css('border-top-width')),
            //    left: rec.left + parseNumeric(this.$parentObj.css('border-left-width')),
            //    height: rec.height,
            //    innerHeight: this.$parent.height(),
            //    scrollHeight: this.$parentObj[0].scrollHeight,
            //};

            var offset = this.$parentObj.offset();
            return {
                top: offset.top + parseNumeric(this.$parentObj.css('border-top-width')),
                left: offset.left + parseNumeric(this.$parentObj.css('border-left-width')),
                height: this.$parent.height(),
                innerHeight: this.$parent.height(),
                outerHeight: this.$parent.outerHeight(),
                scrollHeight: this.$parentObj[0].scrollHeight,
            };
        }
        StickyParent.prototype._getOverScrollTop = function () {
            if (this.isWindow) return 0;

            //さらに上の要素のスクロールTOP
            var exists = false;
            var scrollTop = 0;
            for (var i = 0; i < this.parents.length; i++) {
                var $target = $(this.parents[i]);

                if (this.equals($target)) {
                    exists = true;
                    continue;
                }
                if (exists == false) continue;

                var scTop = $target.scrollTop();

                scrollTop += scTop;
            }
            return scrollTop;
        }
        StickyParent.prototype.getHeight = function () {
            return this.isWindow ? window.innerHeight : this.$parentObj.height();
        }

        StickyParent.prototype.dispose = function () {
            //イベント処理対象から削除
            _events = _events.filter(function (ev) {
                return equals(_events[i].behavior, this) == false;
            });
        }

        StickyParent.prototype.hasMulti = function () {
            return this.parents.length > 1;
        }

        return StickyParent;
    })();

    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * stickyを扱うクラス
     */
    var Sticky = (function () {

        var Sticky = function (element, settings) {
            this.$ctrl = $(element);
            this.settings = settings;

            this.$container = null;
            this.$spacer = null;
            this.parent = null;
            this.initStyles = null;
            this.firstChildInfo = null;
            this.lastChildInfo = null;
            this.isChangeWidth = false;
            this.enabled = false;
            this.stickyMode = 'static';

            this.stickyOffset = {
                top: null,
                bottom: null
            };
            this.stickyPosition = {
                isTop: false,
                isBottom: false,
                fixedTop: null,
                fixedBottom: null,
                absoluteTop: null,
                absoluteBottom: null
            };

            this.init();
        }

        /**
         * スクロール位置固定を初期化。基準となる親要素を取得したり、幅を設定したり
         */
        Sticky.prototype.init = function() {

            //初期スタイル取得
            this.initStyles = new StyleInfo(this.$ctrl);

            //対象の親コンテナ(位置調整の基準となる)を取得
            this.$container = this.$ctrl.parent();
            while (this.$container.length > 0 && this.$container.css('display') != 'block') {
                this.$container = this.$container.parent();
            }

            //スクロール可能な親コンテナを取得
            this.parent = findParent(this.$container[0]);
            this.parent.add(this);

            //top/bottomの指定なしは処理対象外
            this.stickyPosition.isTop = this.initStyles.computed.top != 'auto';
            this.stickyPosition.isBottom = this.initStyles.computed.bottom != 'auto';

            //bottomはwindowに貼り付けのみ有効
            this.enabled = (this.stickyPosition.isTop || this.stickyPosition.isBottom);

            if (this.enabled == false) return; //対象外

            //先頭/最後の子要素取得＆設定
            this._bindChild();

            //position:fixedにしたときにスクロール位置がずれないよう余白確保用のDIVを作成する
            if (this.settings.spacer) {
                this.$spacer = this._createSpacer(this.settings.spacerCss);
            }

            //自身のpositionをstikcyからabsoluteに変更
            this.$ctrl.css({
                'position'      : 'absolute',
                'top'           : this.stickyPosition.isTop    ? this.initStyles.top    + 'px' : 'auto',
                'bottom'        : this.stickyPosition.isBottom ? this.initStyles.bottom + 'px' : 'auto',
                'margin-top'    : '0px',
                'margin-bottom' : '0px',
            });
            this.stickyMode = 'absolute';

            this.isChangeWidth = this.initStyles.width != this.$ctrl.width();

            //幅を設定(fixedやabsoluteにすると内容の幅になってしまうため)
            this._setWidth();

            //親のpositionをstaticからrelativeに変更
            if (this.$container.css('position') == 'static') {
                this.$container.css('position', 'relative');
            }

            //初期化
            this.update();
        };

        /**
         * 子要素の設定
         */
        Sticky.prototype._bindChild = function () {

            var $firstChild = this.$ctrl.children().first();

            if (!this.firstChildInfo || $firstChild.is(this.firstChildInfo.$element) == false) {
                this._unbindChild('first');

                this.firstChildInfo = new StyleInfo($firstChild);
                $firstChild.css('margin-top', '0px');
            }

            var $lastChild = this.$ctrl.children().last();

            if (!this.lastChildInfo || $lastChild.is(this.lastChildInfo.$element) == false) {
                this._unbindChild('last');

                this.lastChildInfo = new StyleInfo($lastChild);
                $lastChild.css('margin-bottom', '0px');
            }
        }

        /**
         * 子要素を元に戻す
         */
        Sticky.prototype._unbindChild = function (option) {
            if (!option || option.indexOf('first') != -1) {
                if (this.firstChildInfo) {
                    this.firstChildInfo.reset();
                    this.firstChildInfo = null;
                }
            }
            if (!option || option.indexOf('last') != -1) {
                if (this.lastChildInfo) {
                    this.lastChildInfo.reset();
                    this.lastChildInfo = null;
                }
            }
        }

        /**
         * 表示位置を再計算
         */
        Sticky.prototype.update = function () {

            //スクロール位置を取得
            var parentScrollTop = this.parent.scrollTop();

            //先頭の要素を取得
            this._bindChild();

            //対象の親コンテナの上端にきたら位置調整を開始する
            this.stickyOffset.top = 0;
            this.stickyOffset.bottom = 0;
            this.stickyPosition.fixedTop = 'auto';
            this.stickyPosition.fixedBottom = 'auto';
            this.stickyPosition.fixedLeft = 'auto';
            this.stickyPosition.absoluteTop = 'auto';
            this.stickyPosition.absoluteBottom = 'auto';

            //leftが指定されていたら打ち消す
            if (this.initStyles.computed.left != 'auto') {
                this.stickyPosition.fixedLeft = this.initStyles.offsetLeft;
            }

            var parentWinOffset = this.parent.getOffset();

            var containerWinOffset = {
                top: this.$container.offset().top,
                height: this.$container.height()
            };

            if (this.stickyPosition.isTop) {
                //謎の計算式です

                this.stickyPosition.absoluteTop = this.initStyles.offsetTop - containerWinOffset.top - parseNumeric(this.$container.css('border-top-width'));
                this.stickyPosition.absoluteBottom = parseNumeric(this.$container.css('padding-bottom')) + this.initStyles.marginBottom;
                this.stickyPosition.fixedTop = this.initStyles.top;

                this.stickyOffset.top = Math.floor(this.initStyles.offsetTop + parentScrollTop - this.initStyles.top);

                this.stickyOffset.bottom = Math.floor(containerWinOffset.top + parentScrollTop + this.$container.height()
                    - this.initStyles.height - this.initStyles.top - this.initStyles.marginBottom
                    - parseNumeric(this.$ctrl.css('border-top-width')) - parseNumeric(this.$ctrl.css('border-bottom-width')));

                if (this.parent.isWindow == false) {
                    //スクロール可能な親がwindowでない場合
                    this.stickyPosition.fixedTop += parentWinOffset.top;
                    this.stickyOffset.top -= parentWinOffset.top;
                    this.stickyOffset.bottom -= parentWinOffset.top - parseNumeric(this.$container.css('border-top-width'));
                }
            } else if (this.stickyPosition.isBottom) {
                var childWinOffset = this.lastChildInfo.getOffset();

                this.stickyPosition.absoluteTop = this.initStyles.offsetTop - containerWinOffset.top - parseNumeric(this.$container.css('border-top-width'));
                this.stickyPosition.absoluteBottom = parseNumeric(this.$container.css('padding-bottom')) + this.initStyles.marginBottom
                    - (parentWinOffset.scrollHeight - containerWinOffset.height)
                    - parseNumeric(this.$container.css('border-top-width')) - parseNumeric(this.$container.css('border-bottom-width'));
                this.stickyPosition.fixedBottom = this.initStyles.bottom;

                this.stickyOffset.top = 0;
                this.stickyOffset.bottom = parentWinOffset.scrollHeight + this.initStyles.bottom;

                if (this.parent.isWindow) {
                    this.stickyOffset.bottom -= parentWinOffset.height + childWinOffset.height - this.lastChildInfo.marginBottom;
                }
                if (this.parent.isWindow == false) {
                        //スクロール可能な親がwindowでない場合
                    if (this.$container.css('position') == 'fixed') {
                        this.stickyPosition.fixedBottom += containerWinOffset.top;
                        this.stickyOffset.bottom -= containerWinOffset.height + parentWinOffset.top - parseNumeric(this.$container.css('border-bottom-width'));
                    } else {
                        this.stickyPosition.fixedBottom += $(window).height() - containerWinOffset.top - containerWinOffset.height;
                        this.stickyOffset.bottom -= containerWinOffset.height + containerWinOffset.top + parentWinOffset.top - parseNumeric(this.$container.css('border-bottom-width'));
                    }
                }
            }

            //初期位置に表示
            this._scroll(parentScrollTop);

            //デバッグ情報
            if (this.settings.debug) {
                this.$ctrl.attr('data-scrollFixed',
                       '| stickyOffset.top : ' + this.stickyOffset.top
                    + ' | stickyOffset.bottom : ' + this.stickyOffset.bottom
                    + ' | stickyPosition.fixedTop : ' + this.stickyPosition.fixedTop
                    + ' | stickyPosition.fixedBottom : ' + this.stickyPosition.fixedBottom
                    + ' | stickyPosition.absoluteTop : ' + this.stickyPosition.absoluteTop
                    + ' | stickyPosition.absoluteBottom : ' + this.stickyPosition.absoluteBottom
                );
            }
        };

        /**
         * スクロールイベントを処理
         * @param {Number} scrollTop 親要素のscrollTop
         */
        Sticky.prototype._scroll = function (scrollTop) {

            if (this.enabled == false) return;

            if (this.stickyOffset.top <= scrollTop && scrollTop <= this.stickyOffset.bottom) {
                //固定開始
                this._startFixed();

                if (isActive(this.$ctrl, true) == false) {
                    //現在の位置で固定
                    this._startOverflow();
                }

                if (this.stickyMode != 'fixed') {
                    //イベント呼び出し
                    if (this.settings.stickyStart) {
                        this.settings.stickyStart(this.$ctrl);
                    }
                }
            } else {
                //固定解除
                var bottomFix = scrollTop >= this.stickyOffset.bottom;
                this._clearFixed(bottomFix);

                if (this.stickyMode != 'absolute') {
                    //イベント呼び出し
                    if (this.settings.stickyEnd) {
                        this.settings.stickyEnd(this.$ctrl);
                    }
                }
            }
        }

        /**
         * 固定表示を開始
         */
        Sticky.prototype._startFixed = function () {

            this.stickyMode = 'fixed';

            var top = this.stickyPosition.fixedTop;
            var bottom = this.stickyPosition.fixedBottom;

            if (this.parent.hasMulti() && this.$container.css('position') != 'fixed') {

                var offsetTop = this.parent._getOverScrollTop();

                top = add(this.stickyPosition.fixedTop, -offsetTop);
                bottom = add(this.stickyPosition.fixedBottom, -offsetTop);
            }

            //固定
            this.$ctrl.addClass(this.settings.stickyCss)
                .css('position', 'fixed')
                .css('left', this.stickyPosition.fixedLeft)
                .css('top', top)
                .css('bottom', bottom);
        }

        /**
         * 現在の位置で固定
         */
        Sticky.prototype._startOverflow = function () {

            this.stickyMode = 'overflow';

            var top = (this.stickyPosition.fixedTop == 'auto' ? 'auto' : this.initStyles.top + this.parent.$parent.scrollTop());
            var bottom = (this.stickyPosition.fixedBottom == 'auto' ? 'auto' : this.initStyles.bottom - this.parent.$parent.scrollTop());

            //固定
            this.$ctrl.removeClass(this.settings.stickyCss)
                .css('position', 'absolute')
                .css('left', 'auto')
                .css('top', top)
                .css('bottom', bottom);
        }

        /**
         * 固定表示を解除
         * @param {Boolean} bottomFix true:コンテナの下で固定する false:コンテナの上で固定する
         */
        Sticky.prototype._clearFixed = function (bottomFix) {

            this.stickyMode = 'absolute';

            //固定解除
            this.$ctrl.removeClass(this.settings.stickyCss)
                .css('position', 'absolute')
                .css('left', 'auto');

            if (bottomFix) {
                //下側に表示(下方にスクロールしている場合)
                this.$ctrl.css('top', 'auto')
                    .css('bottom', this.stickyPosition.absoluteBottom);
            } else {
                //上側に表示(初期表示/上方にスクロールしている場合)
                this.$ctrl.css('top', this.stickyPosition.absoluteTop)
                     .css('bottom', 'auto');
            }
        }

        /**
         * コントロールの位置をFIXEDにしても後続のコントロールがずれないようにする余白確保用のDIVを作成or取得
         * @param {String} css 余白確保用のDIVに設定するCSSクラス
         * @return {jQuery} 作成した余白確保用のDIV
         */
        Sticky.prototype._createSpacer = function(css) {
            if (this.spacer) return this.spacer; //作成済

            return $('<div />')
                .height(this.$ctrl.outerHeight(false))
                .width(this.$ctrl.outerWidth(false))
                .css('margin-top', (this.initStyles.marginTop + this.firstChildInfo.marginTop) + 'px')
                .css('margin-bottom', (this.initStyles.marginBottom + this.lastChildInfo.marginBottom) + 'px')
                .css('padding-top', '0px')
                .css('padding-bottom', '0px')
                .css('border-width', '0px')
                .addClass(css)
                .insertAfter(this.$ctrl);
        }

        /**
         * ctrlに親と同じ幅を設定
         */
        Sticky.prototype._setWidth = function () {
            if (this.isChangeWidth == false) return;

            var parentBorderWidth = parseNumeric(this.$container.css('border-left-width')) + parseNumeric(this.$container.css('border-right-width'));

            if (this.settings.parentWidth) {
                this.$ctrl.css('width', 'calc(' + this.settings.parentWidth + ' - ' + parentBorderWidth + 'px)');
            } else {

                var scrollBarWidth = this.$container[0].offsetWidth - this.$container[0].clientWidth;

                this.$ctrl.width(this.$container.width() - scrollBarWidth
                    - this.initStyles.paddingLeft - this.initStyles.paddingRight);
            }
        }

        /**
         * スクロール位置固定を解除する
         */
        Sticky.prototype.dispose = function () {
            //固定を解除
            this._clearFixed();

            //子要素のmarginを元に戻す
            this._unbindChild();

            //スタイルを戻す
            this.initStyles.reset();

            //余白を削除
            if (this.$spacer) this.$spacer.remove();

            //親から削除
            this.parent.remove(this);

            //リストから削除
            var sticky = this;
            stickies = stickies.filter(function (x) {
                return x != sticky;
            });
        }

        return Sticky;
    })();

    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * jQueryオブジェクトの呼び出しAPI
     */
    var methods = {
        /**
         * スクロール位置固定の初期化
         * @param {Array} options スクロール位置固定の設定
         */
        init: function (options) {
            var elements = this;
            var settings = $.extend({}, $.fn.scrollFixed.defaults, options);

            //stickyが使えるブラウザの場合、優先設定がない限りブラウザに任せる
            if (settings.important == false && stickySupports) return this;

            elements.each(function () {

                var ctrl = this;
                var sticky = find(ctrl);

                if (sticky) return 'continue';

                stickies.push(new Sticky(this, settings));
            });

            //ウィンドウにサイズ再計算イベントを設定
            var $window = $(window);
            $window.off('resize.scrollFixed');
            $window.on('resize.scrollFixed', function () {
                windowResize();
            });

            return this;
        }
        ,
        resize: function () {

            for (var i = 0; i < stickies.length; i++) {
                stickies[i]._setWidth();
            }
        }
        ,
        /**
         * 表示位置を再計算
         */
        update: function () {
            var elements = this;
            var parents = [];

            elements.each(function () {
                var s = find(this);

                if (!s) return 'continue';

                //固定を解除
                s._clearFixed();

                //幅再設定
                s._setWidth();

                //再計算
                s.update();

                //親コンテナを取得
                if (parents.indexOf(s.parent) == -1) {
                    parents.push(s.parent);
                }
            });

            //親コンテナのスクロールイベントを発火
            for (var i = 0; i < parents.length; i++) {
                s.scroll();
            }
            return this;
        }
        ,
        /**
         * スクロール位置固定を解除する
         */
        dispose: function () {
            var elements = this;
            var ss = [];

            elements.each(function () {
                var sticky = find(this);

                if (!sticky) return 'continue';

                //破棄
                sticky.dispose();

                ss.push(sticky);
            });

            //配列から削除
            stickies = stickies.filter(function (x) {
                return ss.indexOf(x) != -1;
            });

            return this;
        }
    };
})(jQuery)