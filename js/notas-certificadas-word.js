(() => {
  const PAGE_WIDTH = 12242;
  const PAGE_HEIGHT = 20163;
  const MARGINS = { top: 426, right: 340, bottom: 1871, left: 340 };
  const EMU_PER_TWIP = 635;
  const CAPTURE_SCALE = 4;

  const twipsToEmu = (twips) => Math.round(twips * EMU_PER_TWIP);

  function imageDrawing(left, top, width, height) {
    const cx = twipsToEmu(width);
    const cy = twipsToEmu(height);
    return `<w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${twipsToEmu(left)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${twipsToEmu(top)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="1" name="Notas certificadas" descr="Página completa en alta resolución"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Notas_Certificadas.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`;
  }

  function documentXml(left, top, width, height) {
    const drawing = imageDrawing(left, top, width, height);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p><w:r>${drawing}</w:r></w:p>
    <w:sectPr><w:pgSz w:w="${PAGE_WIDTH}" w:h="${PAGE_HEIGHT}" w:code="5"/><w:pgMar w:top="${MARGINS.top}" w:right="${MARGINS.right}" w:bottom="${MARGINS.bottom}" w:left="${MARGINS.left}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
  }

  function contentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  }

  function rootRelationshipsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  function documentRelationshipsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;
  }

  function validateDocumentXml(xml) {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length) {
      throw new Error('El documento Word generado contiene XML inválido.');
    }
  }

  async function captureContent(sheet) {
    const style = window.getComputedStyle(sheet);
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const contentWidth = sheet.clientWidth - paddingLeft - paddingRight;
    const contentHeight = sheet.clientHeight - paddingTop - paddingBottom;

    if (contentWidth <= 0 || contentHeight <= 0) {
      throw new Error('No se pudieron determinar las dimensiones imprimibles de la página.');
    }

    const capture = await window.html2canvas(sheet, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const cropX = Math.round(paddingLeft * CAPTURE_SCALE);
    const cropY = Math.round(paddingTop * CAPTURE_SCALE);
    const cropWidth = Math.round(contentWidth * CAPTURE_SCALE);
    const cropHeight = Math.round(contentHeight * CAPTURE_SCALE);

    if (cropX + cropWidth > capture.width || cropY + cropHeight > capture.height) {
      throw new Error('La captura de la página no coincide con el área imprimible.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen para imprimir.');
    context.imageSmoothingEnabled = false;
    context.drawImage(capture, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return canvas;
  }

  function fitImageToPage(canvas) {
    const availableWidth = PAGE_WIDTH - MARGINS.left - MARGINS.right;
    const availableHeight = PAGE_HEIGHT - MARGINS.top - MARGINS.bottom;
    const fitScale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    const width = Math.round(canvas.width * fitScale);
    const height = Math.round(canvas.height * fitScale);
    return {
      left: MARGINS.left + Math.round((availableWidth - width) / 2),
      top: MARGINS.top + Math.round((availableHeight - height) / 2),
      width,
      height,
    };
  }

  async function guardarNotasWord() {
    const button = document.getElementById('save-word-button');
    const sheet = document.querySelector('.sheet');
    if (!button || !sheet) {
      window.alert('No se encontró el documento para guardar.');
      return;
    }

    const originalLabel = button.textContent;
    const originalZoom = sheet.style.zoom;
    button.disabled = true;
    button.textContent = 'Generando Word...';

    try {
      await document.fonts.ready;
      await window.loadExternalLibrary('html2canvas');
      await window.loadExternalLibrary('jszip');
      sheet.style.zoom = '1';

      const images = Array.from(sheet.querySelectorAll('img'));
      await Promise.all(images.map((image) => image.decode()));
      const canvas = await captureContent(sheet);
      const imageData = canvas.toDataURL('image/png').split(',')[1];
      const dimensions = fitImageToPage(canvas);
      const xml = documentXml(
        dimensions.left,
        dimensions.top,
        dimensions.width,
        dimensions.height,
      );
      validateDocumentXml(xml);

      const zip = new window.JSZip();
      zip.file('[Content_Types].xml', contentTypesXml());
      zip.folder('_rels').file('.rels', rootRelationshipsXml());
      zip.folder('word').file('document.xml', xml);
      zip.folder('word').folder('_rels').file('document.xml.rels', documentRelationshipsXml());
      zip.folder('word').folder('media').file('image1.png', imageData, { base64: true });

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Notas_Certificadas.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error al generar el documento Word de las notas certificadas:', error);
      window.alert('No se pudo guardar el documento Word. Inténtalo de nuevo.');
    } finally {
      sheet.style.zoom = originalZoom;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  window.guardarNotasWord = guardarNotasWord;
})();
