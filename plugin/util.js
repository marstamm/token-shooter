export function applyStyle(element, styles) {
    for (const key in styles) {
        element.style[key] = styles[key];
    }
}