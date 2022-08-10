const TIMESCALE = 0.1;
const GRAVITY = 9.81;
const MAX_SHOOTING_STRENGTH = 150
export default function TokenShooter(eventBus, overlays, elementRegistry) {
  this._eventBus = eventBus;
  this._overlays = overlays;
  this._elementRegistry = elementRegistry;
}

TokenShooter.$inject = ['eventBus', 'overlays', 'elementRegistry'];

TokenShooter.prototype.addToken = function (elementOrId) {
  const self = this;

  const overlays = this._overlays;
  const elementRegistry = this._elementRegistry;
  const eventBus = this._eventBus;


  const element = elementRegistry.get(elementOrId.id || elementOrId);

  const token = self.createToken(element)

  const overlayId = overlays.add(element.id, {
    position: {
      top: element.height / 2,
      left: element.width / 2
    },
    html: token.html
  });

  token.onHit = function (hitElement) {
    overlays.remove(overlayId);
    self.addToken(hitElement);

    eventBus.fire('tokenShooter.tokenHit', {
      from: element,
      to: hitElement,
      token: token
    })
  }
}


TokenShooter.prototype.createToken = function (_element) {
  const self = this;

  const token = {
    bpmnElement: _element
  };

  const html = token.html = document.createElement('div');
  html.innerHTML = '';
  html.className = 'tokenShooter token';
  html.style.position = 'absolute';

  let startPos = {};

  var djsOverlayContainer = document.querySelector('.djs-overlay-container');
  const moveFct = function (evt) {
    var transform = djsOverlayContainer.style.transform

    var scale = parseFloat(transform.substr(7));

    const newPosition = {
      x: (evt.clientX - startPos.x) / scale,
      y: (evt.clientY - startPos.y) / scale
    };

    cropVector(newPosition, MAX_SHOOTING_STRENGTH);

    html.style.left = newPosition.x + 'px'
    html.style.top = newPosition.y + 'px'

    console.log('mouseMove', (evt.clientX - startPos.x) / scale + 'px', (evt.clientY - startPos.y) / scale + 'px')

    // stop bpmnIO from scrolling the diagram
    evt.stopImmediatePropagation();
  };

  const upFct = function (evt) {
    console.log('mouseup');
    evt.stopPropagation();

    const offset = {
      x: parseFloat(html.style.left),
      y: parseFloat(html.style.top)
    }

    var transform = djsOverlayContainer.style.transform

    var scale = parseFloat(transform.substr(7));

    startPos = vectorMult(startPos, 1 / scale)

    startTrajectory(offset);

    document.removeEventListener('mouseup', upFct);
    document.removeEventListener('mousemove', moveFct);
  }

  html.addEventListener('mousedown', function (evt) {
    console.log('mouseDown');
    startPos.x = evt.clientX;
    startPos.y = evt.clientY;

    document.addEventListener('mousemove', moveFct);
    document.addEventListener('mouseup', upFct);

    evt.stopPropagation();
  })


  const startTrajectory = function (offset) {

    let movementVector = {
      x: -offset.x,
      y: -offset.y
    }

    let currentOffset = offset

    const animationFct = function () {
      currentOffset = {
        x: currentOffset.x + (movementVector.x * TIMESCALE),
        y: currentOffset.y + movementVector.y * TIMESCALE
      }

      movementVector = {
        x: movementVector.x,
        y: movementVector.y + (GRAVITY * TIMESCALE)
      }

      html.style.left = currentOffset.x + 'px';
      html.style.top = currentOffset.y + 'px';

      const tokenStart = {
        x: _element.x + _element.width / 2,
        y: _element.y + _element.height / 2
      }

      const hitElement = self.findHit(vectorAdd(tokenStart, currentOffset), token);

      if (hitElement) {
        token.onHit(hitElement);
      } else {
        window.requestAnimationFrame(animationFct)
      }
    }

    window.requestAnimationFrame(animationFct)
  }

  return token;
}


TokenShooter.prototype.findHit = function (position, token) {
  const self = this;
  const bbox = {
    x: position.x - 5,
    y: position.y - 5,
    width: 10,
    height: 10
  }
  const elements = this._elementRegistry.getAll();
  const hit = elements.find(function (element) {
    if (element.waypoints) return
    // console.log(element)
    // if(is)
    if (element === token.bpmnElement) {
      return false;
    }

    return isOverlapping(bbox, element)
  });


  return hit;
}

function isOverlapping(a, b) {
  console.log(a, b)

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

cropVector = function (vector, maxLength) {
  if (vectorLength(vector) > maxLength) {
    const factor = maxLength / vectorLength(vector)
    vector.x *= factor
    vector.y *= factor
  }
}

vectorLength = function (vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}