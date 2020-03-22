# fixedScroll

fixedScroll is `position:sticky` polyfill.

## Licence

[MIT](https://github.com/tcnksm/tool/blob/master/LICENCE)

## Description
* support position top, bottom
* works in IE9+
* overflowed blocks don't work correctly
* disabled in native support browser

## Requirement
* jQuery (>= 1.12.4)

## Usage
### HTML
```
<div class="sticky-sample-class" style="position:sticky; top:0px;">
    ... contents ...
</div>
```

### Javascript
```
$('.sticky-sample-class').scrollFixed();
```

## Options
### `stickyCss` : String  : "scrollFixed"
Class name to add to the sticking object.

### `spacer` : Boolean  : true
Create DOM object for alignment after target object.

### `spacerCss` : String  : "spacer"
Class name to add to the spacer object.

### `parentWidth` : Number  : null
The width to set if no width is specified for the target object.
If null, width of parent object.

### `important` : Boolean  : false
Enable in native support browser.

### `stickyStart` : Function  : null
Callback when changing from absolute to fixed.

### `stickyEnd` : Function  : null
Callback when changing from fixed to absolute.

### `debug` : Boolean  : false
Add attribute `data-scrollFixed` to DOM Object to debug information.

## API
### `resize()`
Recalculate width.

### `update()`
Recalculate position and height.

### `dispose()`
Remove events and spacer.
