const TIMESCALE = 0.1;
const GRAVITY = 9.81;

export default function TokenShooter(eventBus, overlays, elementRegistry) {
  this._eventBus = eventBus;
  this._overlays = overlays;
  this._elementRegistry = elementRegistry;

  const self = this;

  eventBus.on('import.done', function () {
    const startEvent = elementRegistry.get("StartEvent_1");
    overlays.add(startEvent.id, {
      position: {
        bottom: 0,
        right: 0
      },
      html: self.createToken(startEvent)
    });
  })
}

TokenShooter.$inject = ['eventBus', 'overlays', 'elementRegistry'];

TokenShooter.prototype.createToken = function (_element) {
  const self = this;

  const token = document.createElement('div');
  token.innerHTML = 'O';
  token.className = 'token';
  token.style.position = 'absolute';

  const startPos = {};

  var djsOverlayContainer = document.querySelector('.djs-overlay-container');
  const moveFct = function (evt) {
    var transform = djsOverlayContainer.style.transform

    var scale = parseFloat(transform.substr(7));
    token.style.left = (evt.clientX - startPos.x) / scale + 'px'
    token.style.top = (evt.clientY - startPos.y) / scale + 'px'

    console.log('mouseMove', (evt.clientX - startPos.x) / scale + 'px', (evt.clientY - startPos.y) / scale + 'px')

    // stop bpmnIO from scrolling the diagram
    evt.stopImmediatePropagation();
  };

  token.addEventListener('mousedown', function (evt) {
    console.log('mouseDown');
    startPos.x = evt.clientX;
    startPos.y = evt.clientY;

    token.addEventListener('mousemove', moveFct);

    evt.stopPropagation();
  })

  token.addEventListener('mouseup', function (evt) {
    console.log('mouseup');
    token.removeEventListener('mousemove', moveFct);
    evt.stopPropagation();

    const offset = {
      x: parseFloat(token.style.left),
      y: parseFloat(token.style.top)
    }

    startTrajectory(offset);
  })

  const startTrajectory = function (offset) {

    console.log('startTrajectory', offset);
    let movementVector = {
      x: -offset.x,
      y: -offset.y
    }

    let currentOffset = offset

    const animationFct = function () {
      console.log('requestAnimationFrame', currentOffset);
      currentOffset = {
        x: currentOffset.x + (movementVector.x * TIMESCALE),
        y: currentOffset.y + movementVector.y * TIMESCALE
      }

      movementVector = {
        x: movementVector.x,
        y: movementVector.y + (GRAVITY * TIMESCALE)
      }

      token.style.left = currentOffset.x + 'px';
      token.style.top = currentOffset.y + 'px';

      const hitElement = self.findHit(vectorAdd(startPos, currentOffset));

      if (hitElement) {
        // handle hit
        console.log(hitElement);
      } else {
        window.requestAnimationFrame(animationFct)
      }
    }

    window.requestAnimationFrame(animationFct)
  }

  return token;

}


TokenShooter.prototype.findHit = function (position) {
  const self = this;
  const bbox = {
    x: position.x,
    y: position.y,
    width: 11,
    height: 18
  }
  const elements = this._elementRegistry.getAll();
  const hit = elements.find(function (element) {
    if (element.waypoints) return
    // console.log(element)
    // if(is)
    return isOverlapping(bbox, element)
  });

  return hit;
}

function isOverlapping(a, b) {
  return (a.x < b.x + b.width && a.x + a.width > b.x) && (a.y < b.y + b.height && a.y + a.height > b.y);
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