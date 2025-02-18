/*    scrollbar code      */
/*     just for fun       */
/* for late night sadness */

class Scrollbar {
    constructor(viewboxSize, contentSize, scrollbarContainerSize) {

        this.viewboxSize = viewboxSize;
        this.viewboxPosition - undefined;

        this.barSize = undefined;
        this.barPosition = 0;

        this.contentSize = contentSize;

        this.scrollbarContainerSize = scrollbarContainerSize;

        this._recalcBarSize();
        this._recalcViewboxPosition();

    }

    _recalcBarSize() {
        this.barSize = this.viewboxSize * (this.viewboxSize / this.contentSize);
        this.barSize = Math.max(this.barSize, 14);
    }

    _recalcBarPosition() {
        this.barPosition = this.viewboxSize * (this.viewboxPosition / this.contentSize);
        this._constrainBarPosition();
    }

    _recalcViewboxPosition(val) {
        this.viewboxPosition = (this.barPosition / this.viewboxSize) * this.contentSize;
    }

    _constrainBarPosition() {
        this.barPosition = Math.max(this.barPosition, 0);
        this.barPosition = Math.min(this.barPosition, this.scrollbarContainerSize-this.barSize);
    }

    setViewboxSize(val) {
        this.viewboxSize = val;
        this._recalcBarSize();
        this._recalcBarPosition();
        this._recalcViewboxPosition();
    }

    setContentSize(val) {
        this.contentSize = val;
        this._recalcBarSize();
        this._recalcBarPosition();
        this._recalcViewboxPosition();
    }

    setBarPosition(val) {
        this.barPosition = val;
        this._constrainBarPosition();
        this._recalcViewboxPosition();
        this._recalcBarPosition();
    }

    setViewboxPosition(val) {
        this.viewboxPosition = val;
        this._recalcBarPosition();
    }

    setScrollbarContainerSize(val) {
        this.scrollbarContainerSize = val;
    }
}