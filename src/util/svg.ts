const svgns = 'http://www.w3.org/2000/svg';

export function measureTextBBox(svg: SVGSVGElement, text: string, styles: object) {
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, styles);

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bbox = textElement.getBBox();

  svg.removeChild(textElement);

  return bbox;
}

export function measureTextHeight(svg: SVGSVGElement, text: string, styles: object) {
  const data = document.createTextNode(text);

  const textElement = document.createElementNS(svgns, 'text');
  Object.assign(textElement.style, styles);
  textElement.style.dominantBaseline = 'alphabetic';

  textElement.appendChild(data);

  svg.appendChild(textElement);

  const bottomAlignedBBox = textElement.getBBox();

  textElement.style.dominantBaseline = 'hanging';

  const topAlignedBBox = textElement.getBBox();

  svg.removeChild(textElement);

  return topAlignedBBox.y - bottomAlignedBBox.y;
}
