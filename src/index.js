import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import diagram from "./diagram.bpmn";

console.log(diagram);

(async () => {
    var viewer = new BpmnViewer({
        container: '#canvas'
    });
    
    await viewer.importXML(diagram);
    
    console.log('success!');
    viewer.get('canvas').zoom('fit-viewport');    
})()
