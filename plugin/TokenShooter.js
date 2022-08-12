import { applyStyle } from "./util";

const TIMESCALE = 0.1;
const GRAVITY = 9.81;
const MAX_SHOOTING_STRENGTH = 150
export default function TokenShooter(eventBus, overlays, elementRegistry) {
  this._eventBus = eventBus;
  this._overlays = overlays;
  this._elementRegistry = elementRegistry;
}

TokenShooter.$inject = ['eventBus', 'overlays', 'elementRegistry'];

TokenShooter.prototype.addToken = function (elementOrId, text) {
  const self = this;

  const overlays = this._overlays;
  const elementRegistry = this._elementRegistry;
  const eventBus = this._eventBus;


  const element = elementRegistry.get(elementOrId.id || elementOrId);

  const token = self.createToken(element, text)

  const overlayId = overlays.add(element.id, {
    position: {
      top: 0,
      left: 0
    },
    html: token.html
  });

  token.onHit = function (hitElement) {
    overlays.remove(overlayId);

    if (hitElement.type !== 'bpmn:EndEvent')
      self.addToken(hitElement, text);

    eventBus.fire('tokenShooter.tokenHit', {
      from: element,
      to: hitElement,
      token: token
    })
  }
}


TokenShooter.prototype.createToken = function (_element, text = '') {
  const self = this;

  const token = {
    bpmnElement: _element
  };

  const outerHtml = token.html = document.createElement('div');

  outerHtml.className = 'tokenShooter-overlay';

  const tokenStart = {
    x: _element.x + _element.width / 2,
    y: _element.y + _element.height / 2
  }


  const tokenDefaultPosition = {
    x: -10,
    y: _element.height - 18
  }

  const tokenShootingAnchor = {
    x: _element.width / 2,
    y: _element.height / 2
  }

  const anchorPoint = document.createElement('div');
  applyStyle(anchorPoint, {
    position: 'absolute',
    width: '5px',
    height: '5px',
    marginLeft: '-2.5px',
    marginTop: '-2.5px',
    top: tokenShootingAnchor.y + 'px',
    left: tokenShootingAnchor.x + 'px',
    borderRadius: '50%',
    backgroundColor: 'black',
    display: 'none'
  })
  outerHtml.appendChild(anchorPoint);

  const tokenHtml = document.createElement('div');
  tokenHtml.style.position = 'absolute';
  tokenHtml.style.top = tokenDefaultPosition.y + 'px';
  tokenHtml.style.left = tokenDefaultPosition.x + 'px';
  console.log(text)
  tokenHtml.innerHTML = text;
  tokenHtml.className = 'tokenShooter token';
  tokenHtml.style.position = 'absolute';

  outerHtml.appendChild(tokenHtml);

  let startPos = {};

  var djsOverlayContainer = document.querySelector('.djs-overlay-container');
  const moveFct = function (evt) {
    var transform = djsOverlayContainer.style.transform

    var scale = parseFloat(transform.substr(7));

    const newOffset = vectorAdd(tokenDefaultPosition, {
      x: (evt.clientX - startPos.x) / scale,
      y: (evt.clientY - startPos.y) / scale
    });

    const relativeToAnchor = vectorSub(newOffset, tokenShootingAnchor);

    cropVector(relativeToAnchor, MAX_SHOOTING_STRENGTH);

    const newPosition = vectorAdd(relativeToAnchor, tokenShootingAnchor);

    tokenHtml.style.left = newPosition.x + 'px'
    tokenHtml.style.top = newPosition.y + 'px'


    // const hit = self.findHit(vectorAdd(tokenStart, newPosition), token);
    // if (hit) {
    //   tokenHtml.style.backgroundColor = 'red';
    // } else {
    //   tokenHtml.style.backgroundColor = 'blue';

    // }

    // stop bpmnIO from scrolling the diagram
    evt.stopImmediatePropagation();
  };

  const upFct = function (evt) {
    console.log('mouseup');
    evt.stopPropagation();

    applyStyle(anchorPoint, { display: 'none' });

    const offset = {
      x: parseFloat(tokenHtml.style.left),
      y: parseFloat(tokenHtml.style.top)
    }

    var transform = djsOverlayContainer.style.transform

    var scale = parseFloat(transform.substr(7));

    startPos = vectorMult(startPos, 1 / scale)

    startTrajectory(offset, vectorSub(vectorAdd(offset, {
      x: 13,
      y: 9
    }), tokenShootingAnchor));

    document.removeEventListener('mouseup', upFct);
    document.removeEventListener('mousemove', moveFct);
  }

  tokenHtml.addEventListener('mousedown', function (evt) {
    console.log('mouseDown');
    startPos.x = evt.clientX;
    startPos.y = evt.clientY;

    document.addEventListener('mousemove', moveFct);
    document.addEventListener('mouseup', upFct);

    applyStyle(anchorPoint, { display: '' });

    evt.stopPropagation();
  })


  const startTrajectory = function (position, vector) {

    let movementVector = {
      x: -(vector.x),
      y: -(vector.y)
    }

    let currentOffset = position

    const animationFct = function () {
      currentOffset = {
        x: currentOffset.x + (movementVector.x * TIMESCALE),
        y: currentOffset.y + movementVector.y * TIMESCALE
      }

      movementVector = {
        x: movementVector.x,
        y: movementVector.y + (GRAVITY * TIMESCALE)
      }

      tokenHtml.style.left = currentOffset.x + 'px';
      tokenHtml.style.top = currentOffset.y + 'px';

      const hitElement = self.findHit(vectorAdd(tokenStart, currentOffset), token);

      if (hitElement && self.canHit(hitElement)) {
        token.onHit(hitElement, tokenHtml.innerHTML);
      } else {
        window.requestAnimationFrame(animationFct)
      }
    }

    window.requestAnimationFrame(animationFct)
  }

  return token;
}

TokenShooter.prototype.canHit = function (element) {
  const eventBus = this._eventBus;
  console.log('tokenShooter.canHit');
  return eventBus.fire('tokenShooter.canHit', { element });
}


TokenShooter.prototype.findHit = function (position, token) {
  const self = this;
  const eventBus = this._eventBus
  const bbox = {
    x: position.x - 26 - 24,
    y: position.y - 18 - 22,
    width: 26,
    height: 18
  }
  const elements = this._elementRegistry.getAll();
  const hit = elements.find(function (element) {
    if (element.waypoints) return


    return isOverlapping(bbox, element) && eventBus.fire('tokenShooter.canHit', { element, token });
  });

  if (hit === token.bpmnElement && (typeof token.firstPass === 'undefined' || token.firstPass)) {
    token.firstPass = true;
    return undefined;
  }

  if (hit !== token.bpmnElement && token.firstPass) {
    token.firstPass = false;
  }

  return hit;
}

function isOverlapping(a, b) {
  // console.log(a, b)

  return (a.x < b.x + b.width && a.x + a.width > b.x) && (a.y < b.y + b.height && a.y + a.height > b.y);
}

const vectorMult = function (a, factor) {
  return {
    x: a.x * factor,
    y: a.y * factor
  }
}

const vectorAdd = function (a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  }
}

const vectorSub = function (a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  }
}

function cropVector(vector, maxLength) {
  if (vectorLength(vector) > maxLength) {
    const factor = maxLength / vectorLength(vector)
    vector.x *= factor
    vector.y *= factor
  }
}

function vectorLength(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}