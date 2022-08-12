import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import diagram from "./diagram.bpmn";

import plugin from "../plugin"

(async () => {

    var viewer = new BpmnViewer({
        container: '#canvas',
        additionalModules: [
            plugin
        ]
    });

    window.viewer = viewer;

    await viewer.importXML(diagram);

    console.log('success!');
    viewer.get('canvas').zoom('fit-viewport');

    viewer.get('tokenShooter').addToken('Activity_14ibh2e', '1');

    viewer.get('eventBus').on('tokenShooter.canHit', (e) => {
        console.log('tokenShooter.canHit', e.element);
        return true;
    })
})()
