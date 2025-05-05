/** Zfetch
 * Input handler for Zdog
 */

( function( root, factory ) {
	// module definition
	if ( typeof module == 'object' && module.exports ) {
		// CommonJS
		module.exports = factory();
	} else {
		// browser global
		root.Zfetch = factory();
	}
}( this, function factory() {
var DEBUG = false;
if ( typeof window == 'undefined' || !window.PointerEvent ) {
	console.error( 'Zfetch requires PointerEvent support.' );
	return;
}

function noop() {}

Zfetch.prototype.rotateStart = function( pointer ) {
	this.rotateStartX = this.scene.rotate.x;
	this.rotateStartY = this.scene.rotate.y;
}

Zfetch.prototype.rotateMove = function( pointer, target, moveX, moveY ) {
	let displaySize = Math.min( this.scene.width, this.scene.height );
	let moveRY = moveX / displaySize * Math.PI * Zdog.TAU;
	let moveRX = moveY / displaySize * Math.PI * Zdog.TAU;
	this.scene.rotate.x = this.rotateStartX - moveRX;
	this.scene.rotate.y = this.rotateStartY - moveRY;
}

function Zfetch( options ) {
	this.init( options || {} );
}

Zfetch.prototype.init = function( options ) {
	this.click = options.click || noop;
	this.dragStart = options.dragStart || (options.dragRotate ? this.rotateStart : noop);
	this.dragMove = options.dragMove || (options.dragRotate ? this.rotateMove : noop);
	this.dragEnd = options.dragEnd || noop;
	this.capture = options.capture || false;
	this.dragRotate = options.dragRotate;
	this.scene = options.scene;
	this.startElement = options.scene.element;

	this.bindListeners( this.startElement );
	this.initGhost( options.scene );
};

Zfetch.prototype.bindListeners = function( element ) {
	element = this.getQueryElement( element );
	if ( !element ) {
		console.error( 'Zfetch: startElement not found: ' + element );
		return;
	}
	// disable browser gestures
	// issue #53 on Zdog GitHub
	element.style.touchAction = 'none';
	element.addEventListener( 'pointerdown', this );
};

Zfetch.prototype.getQueryElement = function( element ) {
	if ( typeof element == 'string' ) {
		// with string, use query selector
		return document.querySelector( element );
	}
	return element;
};

Zfetch.prototype.handleEvent = function( event ) {
	if (DEBUG) console.log(event.type, event);
	var method = this[ 'on' + event.type ];
	if ( method ) {
		method.call( this, event );
	}
};

Zfetch.prototype.down = function( event ) {
	if ( !event.isPrimary ) return;

	if (this.capture) {
		this.startElement.setPointerCapture( event.pointerId );
		this.startElement.addEventListener( 'lostpointercapture', this );
	}

	this.downX = event.pageX;
	this.downY = event.pageY;
	this.moveX = 0;
	this.moveY = 0;
	this.downId = event.pointerId;

	this.dragEvent = event;
	this.onpointermove = this.moveDeadzone;

	this.startElement.addEventListener( 'pointermove', this );
	this.startElement.addEventListener( 'pointerup', this );
	this.startElement.addEventListener( 'pointercancel', this );
};

Zfetch.prototype.move = function( event ) {
	if ( event.pointerId != this.downId ) return;
	
	this.moveX = event.pageX - this.downX;
	this.moveY = event.pageY - this.downY;
	this.dispatchDragMove( event );
};

Zfetch.prototype.moveDeadzone = function( event ) {
	if ( event.pointerId != this.downId ) return;

	let moveX = event.pageX - this.downX;
	let moveY = event.pageY - this.downY;

	var deadzone = 5;
	if ( event.pointerType == 'mouse' )
		deadzone = -1;
	if ( Math.abs( moveX ) > deadzone || Math.abs( moveY ) > deadzone ) {
		this.dispatchDragStart( this.dragEvent );
		this.onpointermove = this.move;
		this.onpointermove( event );
	}
}

Zfetch.prototype.up = function( event ) {
	if ( event.pointerId != this.downId ) return;

	if ( this.capture ) {
		this.startElement.releasePointerCapture( event.pointerId );
		this.startElement.removeEventListener( 'lostpointercapture', this );
	}

	if (DEBUG) console.log("going uuuuup", event);

	if ( this.moveX || this.moveY ) {
		this.dispatchDragEnd( event );
	} else {
		this.dispatchClick( event );
	}

	this.startElement.removeEventListener( 'pointermove', this );
	this.startElement.removeEventListener( 'pointerup', this );
	this.startElement.removeEventListener( 'pointercancel', this );
};

Zfetch.prototype.onpointerdown = Zfetch.prototype.down;
Zfetch.prototype.onpointermove = Zfetch.prototype.move;
Zfetch.prototype.onpointerup =
Zfetch.prototype.onpointercancel =
Zfetch.prototype.onlostpointercapture = Zfetch.prototype.up;

Zfetch.prototype.dispatchDragStart = function( event ) {
	this.dragEvent = null;
	this.dispatch( "dragStart", event );
};

Zfetch.prototype.dispatchDragMove = function( event ) {
	this.dispatch( "dragMove", event );
};

Zfetch.prototype.dispatchDragEnd = function( event ) {
	this.dispatch( "dragEnd", event );
};

Zfetch.prototype.dispatchClick = function( event ) {
	this.dispatch( "click", event );
};

Zfetch.prototype.dispatch = function( event, pointer ) {
	if (DEBUG) console.log("dispatching", event, pointer);
	var moveX = this.moveX;
	var moveY = this.moveY;
	var target = this.getTargetShape( pointer );
	target.element = this.startElement;
	if (DEBUG) console.log("pointer, target, x, y", pointer, target, moveX, moveY);
	this[ event ]( pointer, target, moveX, moveY );
};

Zfetch.prototype.initGhost = function( scene ) {
	if ( this.scene.isSvg ) {
		this.initSvgGhost( scene );
	} else {
		this.initCanvasGhost( scene );
	}
	this.updateGhost();
};

Zfetch.prototype.initSvgGhost = function() {
	this.ghostElem = document.createElement( 'svg' );
	this.ghostElem.setAttribute( 'width', this.scene.element.clientWidth );
	this.ghostElem.setAttribute( 'height', this.scene.element.clientHeight );
	/*this.ghostElem.style.display = "none";
	this.ghostElem = document.body.appendChild( this.ghostElem );*/
};

Zfetch.prototype.updateGhost = function() {
	this.ghost = this.scene.copyGraph({ element: this.ghostElem });
	this.ghost.updateGraph();
	for ( let i = 0; i < this.ghost.flatGraph.length; i++ ) {
		const shape = this.ghost.flatGraph[i];
		shape.twin = this.scene.flatGraph[i];
		shape.color = "#" + (i).toString(16).padStart(6, "0");
		let faces = [
			"leftFace",
			"rightFace",
			"topFace",
			"bottomFace",
			"frontFace",
			"rearFace",
			"backface"
		];
		// override overridden faces
		for ( let face of faces ) {
			if ( shape.twin[ face ] )
				shape[ face ] = shape.color;
		}
	}
	this.ghost.renderGraph();
};

Zfetch.prototype.getSvgPath = function( root, element ) {
	const path = [];
	let current = element;

	while ( current !== root ) {
		const parent = current.parentElement;
		const index = Array.from( parent.children ).indexOf( current );
		path.unshift( index );
		current = parent;
	}

	return path;
};

Zfetch.prototype.getElementByPath = function( root, path ) {
	let current = root;

	for ( const index of path ) {
		current = current.children[ index ];
	}

	return current;
};

// TODO: This isn't returning correctly for the surface of cylinders.
Zfetch.prototype.getTargetShape = function( pointer ) {
	if ( this.scene.isSvg )
		return this.getTargetShapeSvg( pointer );

	return this.getTargetShapeCanvas( pointer );
};

Zfetch.prototype.getTargetShapeSvg = function( pointer ) {
	// happy path: if we're on an svg
	if ( pointer.target.tagName == "svg" )
		return this.scene;

	this.updateGhost();
	let path = this.getSvgPath( this.scene.element, pointer.target );
	let ghostElem = this.getElementByPath( this.ghostElem, path );
	let color = ghostElem.getAttribute( "fill" );
	if ( color == "none" )
		color = ghostElem.getAttribute( "stroke" );
	if ( color == "none" )
		return this.scene;
	let ghostShape = Array.from( this.ghost.flatGraph ).find( shape => shape.color === color );
	if ( !ghostShape )
		return this.scene;
	return ghostShape.twin;
};

return Zfetch;

}) );