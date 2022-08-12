let enabled = localStorage.getItem('shooterEnabled') === 'true';


if (enabled) {
    document.body.classList.add('shooter-open');
}

function toggleShooter() {
    document.body.classList.toggle('shooter-open');
    localStorage.setItem('shooterEnabled', document.body.classList.contains('shooter-open'));
    enabled = !enabled;
}

const shooterButton = {
    id: 'shooterButton',
    pluginPoint: 'cockpit.processInstance.runtime.action',
    priority: 9999999,
    render: node => {
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-default', 'btn-toolbar');
        button.innerText = '⚠️';

        if (enabled) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            button.classList.toggle('active');
            toggleShooter();
        });

        node.appendChild(button);
    }
}

const shooter = {
    id: 'shooter',
    pluginPoint: 'cockpit.processInstance.diagram.plugin',
    priority: 0,
    render: async (viewer, props) => {

        async function getActivityMap() {
            const json = await (await fetch(`http://localhost:8080/camunda/api/engine/engine/default/process-instance/${processInstanceId}/activity-instances`)).json()

            const allInstances = [...json.childActivityInstances, ...json.childTransitionInstances];

            return allInstances.reduce((acc, activityInstance) => {
                console.log(acc, activityInstance);
                acc[activityInstance.activityId] = acc[activityInstance.activityId] || [];
                acc[activityInstance.activityId].push(activityInstance);
                return acc;
            }, {})


        }

        const {
            processInstanceId
        } = props;

        const shooter = viewer.get('tokenShooter');
        const elementRegistry = viewer.get('elementRegistry');
        const eventBus = viewer.get('eventBus');


        const local = localStorage.getItem('shooter-' + processInstanceId)
        const activityMap =
            local ? JSON.parse(local) :
                await getActivityMap();

        console.log((await (await fetch(`http://localhost:8080/camunda/api/engine/engine/default/process-instance/${processInstanceId}/activity-instances`)).json()));
        // const activityMap = activityInstances
        console.log(local, activityMap);
        Object.keys(activityMap).forEach(activityId => {
            shooter.addToken(activityId, activityMap[activityId].length);
        })


        eventBus.on('tokenShooter.tokenHit', e => {
            const {
                from,
                to,
                token
            } = e;

            if (to.type !== 'bpmn:EndEvent')
                activityMap[to.id] = activityMap[from.id]

            delete activityMap[from.id];

            console.log('token hit', to, activityMap);

            localStorage.setItem('shooter-' + processInstanceId, JSON.stringify(activityMap));

        })
        // const elements = elementRegistry.getAll().filter(element => {
        //     console.log(element);
        //     return true;
        // });

        // elements.forEach(element => {

        // });

        eventBus.on('tokenShooter.canHit', (e) => {
            if (e.element.type === 'bpmn:Participant'
                || e.element.type === 'bpmn:Lane'
                || e.element.type === 'label') {
                return false
            }
            return true;
        });


        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                localStorage.removeItem('shooter-' + processInstanceId)
            }
        })
    }
}


export default [
    shooter,
    shooterButton
]


