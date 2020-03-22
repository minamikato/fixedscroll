function initial(selector) {

    //スクロールコントローラー作成
    initScrollController($('.scroll-controller.window'), $(window), true, 'window');

    createScrollFixed();
    $('.chkImportant').on('click', function () {
        createScrollFixed();
    });

    function createScrollFixed() {
        $(selector).scrollFixed('dispose').scrollFixed({ debug: true, important: $('.chkImportant').prop('checked') });
    }
}

function update() {

    var $condition = $('.condition');
    var isWindow = $condition.find('.chkUse').prop('checked') == false;

    //表示データ作成
    var $container = $('.data');
    $('.sticky-container').remove();
    create($container);

    //設定反映
    condition();

    //固定表示設定
    setScrollFixed();

    //スクロールコントローラー再設定
    var $controller = $('.scroll-controller');
    initScrollController($controller, $container, isWindow);
}

function setScrollFixed() {
    //固定表示設定
    $('.sticky-item').scrollFixed({
        debug: true,
        important: $('.chkImportant').prop('checked')
    });
}

function condition() {

    //----- ----- -----
    //window
    //----- ----- -----
    var $conWin = $('.condition-window');
    var $window = $(window);
    $(document.body)
        .css('margin-top', getPx($conWin.find('.txtMarginTop').val()))
        .css('padding-top', getPx($conWin.find('.txtPaddingTop').val()))
        ;
    $window.scrollTop($conWin.find('.txtScrollTop').val());

    //----- ----- -----
    //container
    //----- ----- -----
    var $conCon = $('.condition-container');
    var isWindow = $conCon.find('.chkUse').prop('checked') == false;

    var $container = $('.data');
    if (isWindow) {
        $container.removeClass('container');
    } else {
        $container.addClass('container');
    }
    $container
        .css('margin-top', getPx($conCon.find('.txtMarginTop').val()))
        .css('padding-top', getPx($conCon.find('.txtPaddingTop').val()))
        .css('border-top-width', getPx($conCon.find('.txtBorderTop').val()))
        .scrollTop($conCon.find('.txtScrollTop').val());

    //----- ----- -----
    //sticky container
    //----- ----- -----
    var $conStCon = $('.condition-sticky-container');
    $('.sticky-container')
        .css('width', getPx($conStCon.find('.txtWidth').val()))
        .css('height', getPx($conStCon.find('.txtHeight').val()))
        .css('margin-top', getPx($conStCon.find('.txtMarginTop').val()))
        .css('margin-bottom', getPx($conStCon.find('.txtMarginBottom').val()))
        .css('padding-top', getPx($conStCon.find('.txtPaddingTop').val()))
        .css('padding-bottom', getPx($conStCon.find('.txtPaddingBottom').val()))
        .css('border-top-width', getPx($conStCon.find('.txtBorderTop').val()))
        .css('border-bottom-width', getPx($conStCon.find('.txtBorderBottom').val()));

    //----- ----- -----
    //sticky item
    //----- ----- -----
    var $conItem = $('.condition-item');
    $('.sticky-item')
        .css('top', getPx($conItem.find('.txtTop').val()))
        .css('bottom', getPx($conItem.find('.txtBottom').val()))
        .css('margin-top', getPx($conItem.find('.txtMarginTop').val()))
        .css('margin-bottom', getPx($conItem.find('.txtMarginBottom').val()))
        .css('padding-top', getPx($conItem.find('.txtPaddingTop').val()))
        .css('padding-bottom', getPx($conItem.find('.txtPaddingBottom').val()))
        .css('border-top-width', getPx($conItem.find('.txtBorderTop').val()))
        .css('border-bottom-width', getPx($conItem.find('.txtBorderBottom').val()));
}

function getPx(str) {

    if (!str) return '';
    var num = str.replace('px', '');

    if (isNaN(num)) return str;

    return num + 'px';
}

function conditionClear() {
    var $inputs = $('.condition-table').find('input');

    $inputs.filter('.empty').val('');
    $inputs.filter(':not(.empty)').val('0');
    $inputs.prop('checked', false);
}
function conditionDefault() {

    conditionClear();

    $('.condition-table').find('input').val('');

    $('.txtTop').val('0');
}

function create($container) {

    var inContainer = $('.chkUse').prop('checked');

    for (var i = 0; i < 20; i++) {

        var text = '';
        for (var j = 0; j < 115; j++) {
            text += (text.length > 0 ? ' ' : '') + "test";
        }

        var $content = $('<div />').addClass('sticky-container');

        if (inContainer) {
            $content.appendTo($container);
        } else {
            $content.insertBefore($container);
        }

        $('<h1 />').addClass('sticky-item').text('test ' + (i + 1)).appendTo($content);
        $('<div />').addClass('sticky-dummy').text(text).appendTo($content);
    }
}
function initScrollController($controller, $container, isWindow, title) {

    if ($controller.children().length == 0) {
        $controller[0].innerHTML =
            (title ? '<h1>' + title + '</h1>' : '') +
            '<input type="text" class="controller-position" /> *enter' +
            '<br />' +
            '<input type="button" onmousedown="scrollStart(this, -1);" value="△1" />' +
            '<input type="button" onmousedown="scrollStart(this, 1);" value="▽1" />' +
            '<br />' +
            '<input type="button" onmousedown="scrollStart(this, -10);" value="△10" />' +
            '<input type="button" onmousedown="scrollStart(this, 10);" value="▽10" />' +
            '<label><input type="checkbox" class="chkImportant" style="width:auto;" /> important</label>';

        $controller.find('input:button').on('mouseup', function () {
            scrollEnd(this);
        });
        $controller.find('input:button').on('mouseleave', function () {
            scrollEnd(this);
        });
    }

    var $window = $(window);

    var $pos = $controller.find('.controller-position');
    $pos.off('keydown.scrollPos');
    $pos.on('keydown.scrollPos', scrollInput);

    //スクロール位置表示イベント
    var $scrollTarget = isWindow ? $window : $container;

    $pos.val($scrollTarget.scrollTop());

    if ($controller[0].$target) {
        $controller[0].$target.off('scroll.scrollPos');
    }
    $scrollTarget.on('scroll.scrollPos', function () {
        dispScrollPos($pos, $container);
    });
    $controller[0].$target = $scrollTarget;
}

function dispScrollPos($controller, $container) {
    $controller.val($container.scrollTop());
}

function scroll($ctrl, value, absolute) {
    var $controller = $ctrl.closest('.scroll-controller');
    var $target = $controller[0].$target;

    if (absolute) {
        $target.scrollTop(value);
    } else {
        $target.scrollTop($target.scrollTop() + value);
    }
}


function scrollStart(sender, value) {

    scrollTick(sender, value, 200);
}
function scrollTick(sender, value, interval) {

    scrollEnd(sender);

    scroll($(sender), value);

    sender.scrollTimer = setTimeout(function () {

        var newInterval = interval - 50;
        if (newInterval <= 10) newInterval = 10;

        scrollTick(sender, value, newInterval);

    }, interval);
}
function scrollEnd(sender) {
    if (sender.scrollTimer) {
        clearInterval(sender.scrollTimer);
        sender.scrollTimer = null;

        sender.scrollCounter = 0;
    }
}

function scrollInput() {
    if (event.key === 'Enter') {
        var $input = $(event.target);

        scroll($input, $input.val(), true);
    }
}