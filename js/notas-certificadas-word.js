(() => {
  const PAGE_WIDTH = 12240;
  const PAGE_HEIGHT = 18720;
  const FONT = 'Arial';

  const escapeXml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const pxToTwips = (px) => Math.max(0, Math.round(Number(px || 0) * 15));
  const twipsToEmu = (twips) => Math.round(twips * 635);

  function fontSizePx(element, fallback = 12) {
    const parsed = Number.parseFloat(window.getComputedStyle(element).fontSize);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function runProperties(options = {}) {
    const size = options.size || 18;
    return `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>${options.bold ? '<w:b/>' : ''}${options.italic ? '<w:i/>' : ''}${options.underline ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  }

  function textRun(text, options = {}) {
    const lines = String(text).split(/\r\n|\r|\n/);
    return lines.map((line, index) => {
      const lineBreak = index > 0 ? '<w:r><w:br/></w:r>' : '';
      const content = line ? `<w:t xml:space="preserve">${escapeXml(line)}</w:t>` : '<w:t xml:space="preserve"> </w:t>';
      return `${lineBreak}<w:r>${runProperties(options)}${content}</w:r>`;
    }).join('');
  }

  function inlineRuns(node, inherited) {
    if (node.nodeType === Node.TEXT_NODE) return textRun(node.nodeValue, inherited);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '<w:r><w:br/></w:r>';
    if (tag === 'script' || tag === 'style') return '';

    const style = {
      ...inherited,
      bold: inherited.bold || tag === 'strong' || tag === 'b' || node.classList.contains('field-label'),
      italic: inherited.italic || tag === 'em' || tag === 'i',
      underline: inherited.underline || tag === 'u' || node.classList.contains('heading-underline'),
    };
    const children = Array.from(node.childNodes);
    return children.map((child, index) => {
      const previous = children[index - 1];
      const blockTags = ['div', 'p'];
      const separatedBlock = index > 0
        && child.nodeType === Node.ELEMENT_NODE
        && previous.nodeType === Node.ELEMENT_NODE
        && blockTags.includes(child.tagName.toLowerCase())
        && blockTags.includes(previous.tagName.toLowerCase());
      return `${separatedBlock ? '<w:r><w:br/></w:r>' : ''}${inlineRuns(child, style)}`;
    }).join('');
  }

  function paragraphProperties(options = {}) {
    const properties = [];
    if (options.keepNext) properties.push('<w:keepNext/>');
    if (options.borderBottom) {
      properties.push(`<w:pBdr><w:bottom w:val="single" w:sz="${options.borderBottom.size || 4}" w:space="0" w:color="${options.borderBottom.color || '666666'}"/></w:pBdr>`);
    }

    if (options.before !== undefined || options.after !== undefined || options.line !== undefined) {
      const before = options.before || 0;
      const after = options.after || 0;
      const line = options.line === undefined ? '' : ` w:line="${options.line}" w:lineRule="${options.lineRule || 'auto'}"`;
      properties.push(`<w:spacing w:before="${before}" w:after="${after}"${line}/>`);
    }

    if (options.align) properties.push(`<w:jc w:val="${options.align}"/>`);
    return properties.length ? `<w:pPr>${properties.join('')}</w:pPr>` : '';
  }

  function paragraphXml(element, options = {}) {
    const computed = window.getComputedStyle(element);
    const align = options.align || (computed.textAlign === 'center' ? 'center' : computed.textAlign === 'right' ? 'right' : 'left');
    const runs = Array.from(element.childNodes).map((node) => inlineRuns(node, {
      size: options.size || Math.round(fontSizePx(element) * 1.5),
      bold: Boolean(options.bold),
      italic: false,
      underline: Boolean(options.underline),
    })).join('') || textRun('', { size: options.size || Math.round(fontSizePx(element) * 1.5) });

    return `<w:p>${paragraphProperties({ ...options, align })}${runs}</w:p>`;
  }

  function emptyParagraph() {
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>';
  }

  function spacerParagraph(heightPx) {
    const height = pxToTwips(heightPx);
    if (!height) return '';
    return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${height}" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>`;
  }

  function borderXml(edge, color = '666666', size = 4) {
    return `<w:${edge} w:val="single" w:sz="${size}" w:space="0" w:color="${color}"/>`;
  }

  function cellBordersXml(edges, color = '666666', size = 4) {
    if (!edges || !edges.length) return '';
    const order = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    const orderedEdges = order.filter((edge) => edges.includes(edge));
    return `<w:tcBorders>${orderedEdges.map((edge) => borderXml(edge, color, size)).join('')}</w:tcBorders>`;
  }

  function tableBordersXml(enabled, edges = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) {
    const allEdges = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    const edgeXml = allEdges.map((edge) => {
      if (enabled && edges.includes(edge)) return borderXml(edge, '666666', 4);
      return `<w:${edge} w:val="nil"/>`;
    }).join('');
    return `<w:tblBorders>${edgeXml}</w:tblBorders>`;
  }

  function cellMarginsXml(margins = {}) {
    const top = margins.top || 0;
    const right = margins.right || 0;
    const bottom = margins.bottom || 0;
    const left = margins.left || 0;
    return `<w:tcMar><w:top w:w="${top}" w:type="dxa"/><w:right w:w="${right}" w:type="dxa"/><w:bottom w:w="${bottom}" w:type="dxa"/><w:left w:w="${left}" w:type="dxa"/></w:tcMar>`;
  }

  function tableCellXml(content, width, options = {}) {
    let body = content || emptyParagraph();
    if (body.includes('<w:tbl>') && !body.endsWith(emptyParagraph())) body += emptyParagraph();

    const properties = [`<w:tcW w:w="${width}" w:type="dxa"/>`];
    if (options.gridSpan > 1) properties.push(`<w:gridSpan w:val="${options.gridSpan}"/>`);
    if (options.verticalMerge === 'restart') properties.push('<w:vMerge w:val="restart"/>');
    if (options.verticalMerge === 'continue') properties.push('<w:vMerge/>');
    if (options.borderEdges) properties.push(cellBordersXml(options.borderEdges, options.borderColor, options.borderSize));
    if (options.margins) properties.push(cellMarginsXml(options.margins));
    if (options.textDirection) properties.push(`<w:textDirection w:val="${options.textDirection}"/>`);
    if (options.verticalAlign) properties.push(`<w:vAlign w:val="${options.verticalAlign}"/>`);
    if (options.noWrap) properties.push('<w:noWrap/>');
    return `<w:tc><w:tcPr>${properties.join('')}</w:tcPr>${body}</w:tc>`;
  }

  function tableRowXml(cells, options = {}) {
    const height = options.height ? `<w:trPr><w:trHeight w:val="${options.height}" w:hRule="atLeast"/></w:trPr>` : '';
    return `<w:tr>${height}${cells.join('')}</w:tr>`;
  }

  function wordTableXml(width, columnWidths, rows, options = {}) {
    const total = columnWidths.reduce((sum, column) => sum + column, 0);
    if (total !== width && columnWidths.length) columnWidths[columnWidths.length - 1] += width - total;
    const grid = columnWidths.map((column) => `<w:gridCol w:w="${column}"/>`).join('');
    const margins = options.cellMargins || { top: 15, right: 30, bottom: 15, left: 30 };
    const tableProperties = `<w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${cellMarginsXml(margins)}${tableBordersXml(Boolean(options.bordered), options.borderEdges)}</w:tblPr>`;
    const body = rows.map((row) => {
      const cells = row.cells.map((cell, index) => {
        const definition = typeof cell === 'string' ? { content: cell } : cell;
        const cellWidth = definition.width || columnWidths[index] || 1;
        return tableCellXml(definition.content, cellWidth, definition.options || {});
      });
      return tableRowXml(cells, { height: row.height });
    }).join('');
    return `<w:tbl>${tableProperties}<w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
  }

  function proportionalWidths(total, weights) {
    const sum = weights.reduce((accumulator, value) => accumulator + Math.max(0, value), 0) || weights.length || 1;
    const widths = weights.map((value) => Math.max(1, Math.round(total * (Math.max(0, value) || 1) / sum)));
    if (widths.length) widths[widths.length - 1] += total - widths.reduce((accumulator, value) => accumulator + value, 0);
    return widths;
  }

  function tableColumnWidths(table, width) {
    if (table.classList.contains('schools')) return proportionalWidths(width, [9, 66, 15, 10]);
    if (table.classList.contains('areas')) return proportionalWidths(width, [46, 7, 31, 16]);
    if (table.classList.contains('grades')) return proportionalWidths(width, [45, 6, 21, 6, 8, 8, 6]);
    const firstRow = table.rows[0];
    const widths = firstRow ? Array.from(firstRow.cells).map((cell) => cell.getBoundingClientRect().width) : [1];
    return proportionalWidths(width, widths);
  }

  function tableColumnCount(table) {
    const columns = table.querySelectorAll('colgroup col');
    if (columns.length) return columns.length;
    return Math.max(1, ...Array.from(table.rows).map((row) => Array.from(row.cells).reduce((sum, cell) => sum + cell.colSpan, 0)));
  }

  function cellParagraphXml(cell) {
    if (cell.classList.contains('institution-heading')) {
      const label = cell.querySelector('span') || cell;
      return paragraphXml(label, { align: 'center', size: 9 });
    }

    const computed = window.getComputedStyle(cell);
    const fontSize = Math.round(fontSizePx(cell) * 1.5);
    return paragraphXml(cell, {
      align: computed.textAlign === 'left' ? 'left' : computed.textAlign === 'right' ? 'right' : 'center',
      bold: cell.tagName === 'TH',
      size: fontSize,
    });
  }

  function domTableXml(table, width) {
    const rows = Array.from(table.rows);
    const columns = tableColumnCount(table);
    const slots = rows.map(() => Array(columns).fill(null));

    rows.forEach((row, rowIndex) => {
      let column = 0;
      Array.from(row.cells).forEach((cell) => {
        while (column < columns && slots[rowIndex][column]) column += 1;
        if (column >= columns) throw new Error('La tabla contiene más columnas de las esperadas.');

        const columnSpan = Math.min(cell.colSpan || 1, columns - column);
        const rowSpan = Math.min(cell.rowSpan || 1, rows.length - rowIndex);
        const placement = { cell, start: column, columnSpan, originRow: rowIndex, rowSpan };
        for (let targetRow = rowIndex; targetRow < rowIndex + rowSpan; targetRow += 1) {
          for (let targetColumn = column; targetColumn < column + columnSpan; targetColumn += 1) {
            slots[targetRow][targetColumn] = placement;
          }
        }
        column += columnSpan;
      });
    });

    const columnWidths = tableColumnWidths(table, width);
    const rowXml = rows.map((row, rowIndex) => {
      const cells = [];
      let column = 0;
      while (column < columns) {
        const placement = slots[rowIndex][column];
        if (!placement) {
          cells.push({ content: emptyParagraph(), width: columnWidths[column], options: { verticalAlign: 'center' } });
          column += 1;
          continue;
        }
        if (placement.start !== column) {
          column += 1;
          continue;
        }

        const widthForCell = columnWidths.slice(column, column + placement.columnSpan).reduce((sum, value) => sum + value, 0);
        const isOrigin = placement.originRow === rowIndex;
        const content = isOrigin ? cellParagraphXml(placement.cell) : emptyParagraph();
        const isInstitution = isOrigin && placement.cell.classList.contains('institution-heading');
        cells.push({
          content,
          width: widthForCell,
          options: {
            gridSpan: placement.columnSpan,
            verticalMerge: placement.rowSpan > 1 ? (isOrigin ? 'restart' : 'continue') : undefined,
            textDirection: isInstitution ? 'tbRl' : undefined,
            verticalAlign: 'center',
            margins: { top: 8, right: 12, bottom: 8, left: 12 },
          },
        });
        column += placement.columnSpan;
      }

      const rowHeight = pxToTwips(row.getBoundingClientRect().height);
      return { cells, height: rowHeight };
    });

    const edges = table.classList.contains('post-observation-row')
      ? ['left', 'right', 'bottom']
      : ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
    return wordTableXml(width, columnWidths, rowXml, {
      bordered: true,
      borderEdges: edges,
      cellMargins: { top: 8, right: 12, bottom: 8, left: 12 },
    });
  }

  function makeLayoutTable(width, columnWidths, rowCells, options = {}) {
    const cells = rowCells.map((cell, index) => {
      const definition = typeof cell === 'string' ? { content: cell } : cell;
      const cellOptions = definition.options || {};
      return {
        content: definition.content,
        width: definition.width || columnWidths[index],
        options: {
          ...cellOptions,
          verticalAlign: definition.verticalAlign || cellOptions.verticalAlign || options.verticalAlign || 'top',
          margins: definition.margins || cellOptions.margins || options.cellMargins || { top: 0, right: 0, bottom: 0, left: 0 },
          borderEdges: definition.borderEdges || cellOptions.borderEdges,
          borderColor: definition.borderColor || cellOptions.borderColor,
          borderSize: definition.borderSize || cellOptions.borderSize,
        },
      };
    });
    return wordTableXml(width, columnWidths, [{ cells, height: options.height }], {
      cellMargins: options.cellMargins || { top: 0, right: 0, bottom: 0, left: 0 },
      bordered: false,
    });
  }

  function fieldRowXml(row, width) {
    const fields = Array.from(row.querySelectorAll(':scope > .field'));
    const fieldRects = fields.map((field) => field.getBoundingClientRect());
    const columns = proportionalWidths(width, fieldRects.map((rect) => rect.width));
    const gap = pxToTwips(Number.parseFloat(window.getComputedStyle(row).columnGap) || 0);
    const cells = fields.map((field, index) => {
      const label = field.querySelector('.field-label');
      const value = field.querySelector('.field-value');
      const fieldWidth = columns[index];
      const labelWidth = Math.min(fieldWidth, pxToTwips(label.getBoundingClientRect().width));
      const valueWidth = Math.max(1, fieldWidth - labelWidth);
      const labelParagraph = paragraphXml(label, { align: 'left', bold: true, size: Math.round(fontSizePx(label) * 1.5) });
      const valueParagraph = paragraphXml(value, { align: 'center', size: Math.round(fontSizePx(value) * 1.5) });
      const valueOnlyUnderline = field.classList.contains('value-only-underline') || Boolean(field.closest('.plant-main'));
      const innerCells = [
        { content: labelParagraph, width: labelWidth, options: { verticalAlign: 'center' } },
        {
          content: valueParagraph,
          width: valueWidth,
          options: {
            verticalAlign: 'center',
            borderEdges: valueOnlyUnderline ? ['bottom'] : undefined,
          },
        },
      ];
      const innerTable = makeLayoutTable(fieldWidth, [labelWidth, valueWidth], innerCells, {
        cellMargins: { top: 0, right: 0, bottom: 0, left: 0 },
        verticalAlign: 'center',
      });
      const outerEdges = valueOnlyUnderline ? undefined : ['bottom'];
      const leftMargin = index === 0 ? 0 : Math.round(gap / 2);
      const rightMargin = index === fields.length - 1 ? 0 : gap - leftMargin;
      return {
        content: innerTable,
        width: columns[index],
        options: {
          verticalAlign: 'center',
          borderEdges: outerEdges,
          margins: { top: 0, right: rightMargin, bottom: 0, left: leftMargin },
        },
      };
    });

    const rowHeight = pxToTwips(row.getBoundingClientRect().height);
    return wordTableXml(width, columns, [{ cells, height: rowHeight }], {
      cellMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      bordered: false,
    });
  }

  function imageDrawing(relId, width, height) {
    const cx = twipsToEmu(width);
    const cy = twipsToEmu(height);
    return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Membrete" descr="Membrete del Ministerio de Educación"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Membrete.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  }

  function mastheadXml(header, width) {
    const ministryImage = header.querySelector('.ministry img');
    const imageRect = ministryImage.getBoundingClientRect();
    const leftWidth = Math.round(width * 0.4);
    const rightWidth = width - leftWidth;
    const logoParagraph = `<w:p>${paragraphProperties({ align: 'left' })}<w:r>${imageDrawing('rId1', pxToTwips(imageRect.width), pxToTwips(imageRect.height))}</w:r></w:p>`;
    const heading = header.querySelector('.heading');
    const headingXml = Array.from(heading.children).map((element) => {
      const computed = window.getComputedStyle(element);
      const before = pxToTwips(Number.parseFloat(computed.marginTop) || 0);
      const after = pxToTwips(Number.parseFloat(computed.marginBottom) || 0);
      return paragraphXml(element, {
        align: 'center',
        before,
        after,
        underline: element.tagName === 'H1',
        size: Math.round(fontSizePx(element) * 1.5),
      });
    }).join('');
    const rowCells = [
      { content: logoParagraph, verticalAlign: 'center' },
      { content: headingXml, verticalAlign: 'center' },
    ];
    const row = rowCells.map((cell, index) => ({
      content: cell.content,
      width: index === 0 ? leftWidth : rightWidth,
      options: { verticalAlign: cell.verticalAlign, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
    }));
    return wordTableXml(width, [leftWidth, rightWidth], [{ cells: row, height: pxToTwips(header.getBoundingClientRect().height) }], {
      cellMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      bordered: false,
    });
  }

  function rowOfFieldsXml(section, width) {
    const output = [];
    const rows = Array.from(section.querySelectorAll(':scope > .form-row'));
    rows.forEach((row, index) => {
      output.push(fieldRowXml(row, width));
      if (index < rows.length - 1) {
        const gap = Number.parseFloat(window.getComputedStyle(row).rowGap) || 0;
        output.push(spacerParagraph(gap));
      }
    });
    return output.join('');
  }

  function fieldSectionXml(section, width) {
    const title = section.querySelector('.section-title');
    const titleXml = paragraphXml(title, {
      bold: true,
      size: Math.round(fontSizePx(title) * 1.5),
      after: pxToTwips(Number.parseFloat(window.getComputedStyle(title).marginBottom) || 0),
      keepNext: true,
    });
    return `${spacerParagraph(Number.parseFloat(window.getComputedStyle(section).marginTop) || 0)}${titleXml}${rowOfFieldsXml(section, width)}`;
  }

  function schoolHistoryXml(section, width) {
    const grid = section.querySelector('.schools-grid');
    const left = grid.querySelector('.school-history-left');
    const title = left.querySelector('.section-title');
    const firstTable = left.querySelector('.schools');
    const secondTable = grid.querySelector(':scope > .schools');
    const gridWidth = grid.getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0;
    const columnWidthPx = (gridWidth - gap) / 2;
    const columnWidths = proportionalWidths(width, [columnWidthPx, columnWidthPx]);
    const leftTableWidth = pxToTwips(firstTable.getBoundingClientRect().width);
    const rightTableWidth = pxToTwips(secondTable.getBoundingClientRect().width);
    const titleXml = paragraphXml(title, {
      bold: true,
      size: Math.round(fontSizePx(title) * 1.5),
      before: pxToTwips(2),
      keepNext: true,
    });
    const leftContent = `${titleXml}${domTableXml(firstTable, leftTableWidth)}`;
    const rightContent = domTableXml(secondTable, rightTableWidth);
    const marginHalf = Math.round(pxToTwips(gap) / 2);
    const cells = [
      { content: leftContent, margins: { top: 0, right: marginHalf, bottom: 0, left: 0 } },
      { content: rightContent, margins: { top: 0, right: 0, bottom: 0, left: marginHalf } },
    ];
    const layout = makeLayoutTable(width, columnWidths, cells, { verticalAlign: 'top' });
    return `${spacerParagraph(Number.parseFloat(window.getComputedStyle(section).marginTop) || 0)}${layout}`;
  }

  function gradeUnitXml(unit) {
    const heading = unit.querySelector('h3');
    const table = unit.querySelector('table');
    const headingStyle = window.getComputedStyle(heading);
    const titleXml = paragraphXml(heading, {
      align: 'center',
      bold: true,
      size: Math.round(fontSizePx(heading) * 1.5),
      after: pxToTwips(Number.parseFloat(headingStyle.marginBottom) || 0),
      keepNext: true,
    });
    return `${titleXml}${domTableXml(table, pxToTwips(table.getBoundingClientRect().width))}`;
  }

  function gradePairsXml(section, width) {
    const heading = section.querySelector('.grade-heading');
    const headingMargin = Number.parseFloat(window.getComputedStyle(heading).marginTop) || 0;
    const sectionMargin = Number.parseFloat(window.getComputedStyle(section).marginTop) || 0;
    const parts = [
      spacerParagraph(Math.max(headingMargin, sectionMargin)),
      paragraphXml(heading, {
        bold: true,
        size: Math.round(fontSizePx(heading) * 1.5),
        after: pxToTwips(Number.parseFloat(window.getComputedStyle(heading).marginBottom) || 0),
        keepNext: true,
      }),
    ];
    const pairs = Array.from(section.querySelectorAll(':scope > .grade-pair'));
    pairs.forEach((pair, index) => {
      const units = Array.from(pair.querySelectorAll(':scope > .grade-unit'));
      const gap = Number.parseFloat(window.getComputedStyle(pair).columnGap) || 0;
      const pairWidth = pair.getBoundingClientRect().width;
      const cellWidthPx = (pairWidth - gap) / 2;
      const widths = proportionalWidths(width, [cellWidthPx, cellWidthPx]);
      const marginHalf = Math.round(pxToTwips(gap) / 2);
      const cells = units.map((unit, unitIndex) => ({
        content: gradeUnitXml(unit),
        margins: {
          top: 0,
          right: unitIndex === 0 ? marginHalf : 0,
          bottom: 0,
          left: unitIndex === 0 ? 0 : marginHalf,
        },
      }));
      parts.push(makeLayoutTable(width, widths, cells, {
        verticalAlign: 'top',
        height: pxToTwips(pair.getBoundingClientRect().height),
      }));
      if (index < pairs.length - 1) {
        parts.push(spacerParagraph(Number.parseFloat(window.getComputedStyle(pair).marginBottom) || 0));
      }
    });
    return parts.join('');
  }

  function simpleBorderTable(content, width, height, edges) {
    const cell = {
      content,
      width,
      options: { borderEdges: edges, verticalAlign: 'center' },
    };
    return wordTableXml(width, [width], [{ cells: [cell], height: pxToTwips(height) }], {
      bordered: false,
      cellMargins: { top: 15, right: 30, bottom: 15, left: 30 },
    });
  }

  function signaturesXml(section, width) {
    const signatures = Array.from(section.querySelectorAll(':scope > .signature'));
    const gap = Number.parseFloat(window.getComputedStyle(section).columnGap) || 0;
    const colPx = (section.getBoundingClientRect().width - gap) / signatures.length;
    const columns = proportionalWidths(width, signatures.map(() => colPx));
    const marginHalf = Math.round(pxToTwips(gap) / 2);
    const cells = signatures.map((signature, index) => {
      const heading = signature.querySelector('h3');
      const content = signature.querySelector('.signature-content');
      const fields = content.querySelector('.signature-fields');
      const stamp = content.querySelector('.stamp');
      const fieldWidth = pxToTwips(fields.getBoundingClientRect().width);
      const stampWidth = pxToTwips(stamp.getBoundingClientRect().width);
      const innerWidth = fieldWidth + stampWidth;
      const innerColumns = proportionalWidths(innerWidth, [fieldWidth, stampWidth]);
      const lineElements = Array.from(fields.querySelectorAll('.line'));
      const lineRows = lineElements.map((line, lineIndex) => {
        const bold = lineIndex === 0;
        const paragraph = paragraphXml(line, {
          align: line.classList.contains('centered') ? 'center' : 'left',
          bold,
          size: Math.round(fontSizePx(line) * 1.5),
        });
        const last = lineIndex === lineElements.length - 1;
        const height = pxToTwips(line.getBoundingClientRect().height);
        return {
          height,
          cells: [{
            content: paragraph,
            width: innerColumns[0],
            options: {
              verticalAlign: 'center',
              borderEdges: last ? undefined : ['bottom'],
            },
          }],
        };
      });
      const fieldTable = wordTableXml(innerColumns[0], [innerColumns[0]], lineRows, {
        cellMargins: { top: 0, right: 20, bottom: 0, left: 20 },
        bordered: false,
      });
      const stampParagraph = paragraphXml(stamp, {
        align: 'center',
        size: Math.round(fontSizePx(stamp) * 1.5),
      });
      const inner = makeLayoutTable(innerWidth, innerColumns, [
        { content: fieldTable },
        { content: stampParagraph, borderEdges: ['left'], borderColor: '666666', borderSize: 4 },
      ], { verticalAlign: 'center' });
      const headingXml = paragraphXml(heading, {
        bold: true,
        size: Math.round(fontSizePx(heading) * 1.5),
        after: pxToTwips(2),
        borderBottom: { color: '666666', size: 4 },
      });
      const contentXml = `${headingXml}${inner}`;
      const leftMargin = index === 0 ? 0 : marginHalf;
      const rightMargin = index === signatures.length - 1 ? 0 : marginHalf;
      return {
        content: contentXml,
        margins: { top: 0, right: rightMargin, bottom: 0, left: leftMargin },
        borderEdges: ['left', 'right', 'bottom'],
        borderColor: '666666',
        borderSize: 4,
      };
    });
    return makeLayoutTable(width, columns, cells, {
      verticalAlign: 'top',
      height: pxToTwips(signatures[0].getBoundingClientRect().height),
    });
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/></w:rPr></w:style>
</w:styles>`;
  }

  function contentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  }

  function relationshipsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  async function saveWord() {
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

      const logo = sheet.querySelector('.ministry img');
      await logo.decode();
      const logoCanvas = await window.html2canvas(logo, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const logoData = logoCanvas.toDataURL('image/png').split(',')[1];

      const padding = window.getComputedStyle(sheet);
      const leftMargin = pxToTwips(Number.parseFloat(padding.paddingLeft));
      const rightMargin = pxToTwips(Number.parseFloat(padding.paddingRight));
      const topMargin = pxToTwips(Number.parseFloat(padding.paddingTop));
      const bottomMargin = pxToTwips(Number.parseFloat(padding.paddingBottom));
      const pageContentWidth = PAGE_WIDTH - leftMargin - rightMargin;
      const body = [];
      const masthead = sheet.querySelector('.masthead');
      body.push(mastheadXml(masthead, pageContentWidth));
      body.push(fieldSectionXml(sheet.querySelector('.plant-data'), pageContentWidth));
      body.push(fieldSectionXml(sheet.querySelector('.student-data'), pageContentWidth));
      const schoolHistory = sheet.querySelector('.school-history');
      body.push(schoolHistoryXml(schoolHistory, pageContentWidth));

      const gradeSection = schoolHistory.nextElementSibling;
      body.push(gradePairsXml(gradeSection, pageContentWidth));

      const observations = sheet.querySelector('.observations');
      const observationTitle = observations.querySelector('.section-title');
      body.push(paragraphXml(observationTitle, { bold: true, size: 14, keepNext: true }));
      const observationBox = observations.querySelector('.observations-box');
      body.push(simpleBorderTable(
        paragraphXml(observationBox, { size: 14 }),
        pageContentWidth,
        observationBox.getBoundingClientRect().height,
        ['top', 'left', 'bottom', 'right'],
      ));

      const postObservation = sheet.querySelector('.post-observation-row');
      body.push(domTableXml(postObservation, pageContentWidth));
      body.push(signaturesXml(sheet.querySelector('.signatures'), pageContentWidth));

      const legalNote = sheet.querySelector('.legal-note');
      body.push(spacerParagraph(Number.parseFloat(window.getComputedStyle(legalNote).marginTop) || 0));
      body.push(paragraphXml(legalNote, { size: Math.round(fontSizePx(legalNote) * 1.5) }));

      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>${body.join('')}
    <w:sectPr><w:pgSz w:w="${PAGE_WIDTH}" w:h="${PAGE_HEIGHT}"/><w:pgMar w:top="${topMargin}" w:right="${rightMargin}" w:bottom="${bottomMargin}" w:left="${leftMargin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
      const parsedDocument = new DOMParser().parseFromString(documentXml, 'application/xml');
      const parseErrors = parsedDocument.getElementsByTagName('parsererror');
      const tableCount = parsedDocument.getElementsByTagNameNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'tbl',
      ).length;
      if (parseErrors.length || tableCount === 0) {
        throw new Error('El contenido Word generado no es XML válido o no contiene tablas.');
      }

      const zip = new window.JSZip();
      zip.file('[Content_Types].xml', contentTypesXml());
      zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
      zip.folder('word').file('document.xml', documentXml);
      zip.folder('word').file('styles.xml', stylesXml());
      zip.folder('word').folder('_rels').file('document.xml.rels', relationshipsXml());
      zip.folder('word').folder('media').file('logo.png', logoData, { base64: true });

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

  window.guardarNotasWord = saveWord;
})();
