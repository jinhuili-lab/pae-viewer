import { Utils } from "./utils";
import chroma from "chroma-js";
import { saveAs } from 'file-saver';

export interface Residue {
  symbol: string;
  name?: string;
}

export interface Entity<R extends Residue = Residue> {
  id: any;
  name?: string;
  sequence: R[];
}

export interface Crosslink<E extends Entity = Entity> {
  source: RelativeIndex<E>;
  target: RelativeIndex<E>;
}

export interface RelativeIndex<E extends Entity = Entity> {
  entity: Entity;
  index: number;
}

export class PaeViewer<
  R extends Residue = Residue,
  E extends Entity = Entity,
  C extends Crosslink = Crosslink,
> {
  private _root: any;
  private _template: any;
  private _element: any;

  private _graph: any;
  private _graphDefs: any;
  private _stripePattern: any;
  private _graphArea: any;
  private _paeMatrix: any;
  private _axesGroup: any;
  private _unitTicksGroup: any;
  private _sequenceTicksGroup: any;
  private _sequenceTickLabelsGroup: any;
  private _unitTickLabelsGroup: any;
  private _dividerGroup: any;
  private _interactiveGroup: any;
  private _selectionGroup: any;
  private _crosslinkGroup: any;
  private _regionGroup: any;
  private _paeScale: any;
  private _paeScaleTicks: any;
  private _statusCursor: any;
  private _statusSelection: any;
  private _regionToggleCheckBox: any;
  private _downloadMatrix: any;
  private _downloadSvg: any;

  private _viewBox: any;
  private _colorMapping: any = null;
  private _colorRange: any = subunitColors;

  private _paePalette: any = (chroma as any)
    .cubehelix()
    .start(120)
    .rotations(0)
    .hue(0.8)
    .gamma(1)
    .lightness([0.2, 0.95]);

  private _dim;
  private _crosslinks: any;
  private _crosslinkMarkers: any;
  private _complex: any;
  private _selection: any;
  private _selectedRegion: any = null;
  private _isCursorOnGraph: any = false;
  private _isShiftKeyDown: any = false;

  private _style = {
    general: {
      fontFamily: "Arial, Helvetica, sans-serif",
    },
    defaults: {
      chartColor: "black",
      chartLineThickness: "0.2%",
      fontSize: 0.04,
      selectionOutlineColor: "white",
      markerOutlineColor: "white",
      markerOutlineThickness: "0.2%",
      markerSize: "1%",
    },
    elements: {
      axes: {
        color: "$chartColor",
        thickness: "$chartLineThickness",
      },
      boxes: {
        roundness: "1%",
        color: "white",
        opacity: 0.8,
      },
      dividers: {
        color: "$chartColor",
        thickness: "0.4%",
      },
      ticks: {
        unitInterval: 100, // in sequence coordinates
        fontSize: "$fontSize",
        color: "$chartColor",
        thickness: "$chartLineThickness",
        labelGap: 0.01,
        units: {
          length: 0.02,
        },
        subunits: {
          length: 0.08,
        },
      },
      subunitLabels: {
        gap: 0.16,
        fontWeight: "bold",
        fontStyle: "italic",
        color: "white",
      },
      regions: {
        opacity: 0.7,
        fontSize: "$fontSize",
      },
      selection: {
        lines: {
          color: "$selectionOutlineColor",
          thickness: "0.5%",
          dashLength: "0.5%",
        },
        markers: {
          outlineColor: "$markerOutlineColor",
          outlineThickness: "$markerOutlineThickness",
          size: "$markerSize",
        },
        rect: {
          color: "$selectionOutlineColor",
          opacity: "0.5",
        },
        colors: {
          x: "cyan",
          y: "orange",
          overlap: "magenta",
        },
      },
      crosslinks: {
        outlineColor: "$markerOutlineColor",
        outlineThickness: "$markerOutlineThickness",
        opacity: 0.75,
        size: "$markerSize",
        restraintColors: {
          satisfied: "blue",
          violated: "red",
        },
      },
    },
  };

  constructor(
    root: any,
    template: any,
    style = {},
    colorRange = null,
    paePalette = null,
  ) {
    this._root = root;
    this._template = template;
    this._element = template.content
      .querySelector(".pae-viewer")
      .cloneNode(true);

    this._graph = this._element.querySelector(".pv-graph");
    this._graphDefs = this._graph.querySelector("defs");
    this._stripePattern = this._graphDefs.querySelector("#stripes-template");
    this._graphArea = this._graph.querySelector(".pv-graph-area");
    this._paeMatrix = this._graphArea.querySelector(".pv-pae-matrix");
    this._axesGroup = this._graphArea.querySelector(".pv-axes");
    this._unitTicksGroup = this._axesGroup.querySelector(".pv-unit-ticks");
    this._sequenceTicksGroup =
      this._axesGroup.querySelector(".pv-sequence-ticks");
    this._sequenceTickLabelsGroup = this._axesGroup.querySelector(
      ".pv-sequence-tick-labels",
    );
    this._unitTickLabelsGroup = this._axesGroup.querySelector(
      ".pv-unit-tick-labels",
    );
    this._dividerGroup = this._graphArea.querySelector(".pv-dividers");
    this._interactiveGroup = this._graphArea.querySelector(
      ".pv-interactive-layer",
    );
    this._selectionGroup = this._graphArea.querySelector(".pv-selections");
    this._regionGroup = this._graphArea.querySelector(".pv-regions");
    this._crosslinkGroup = this._graphArea.querySelector(".pv-crosslinks");

    this._paeScale = this._element.querySelector(".pv-color-scale");
    this._paeScaleTicks = this._element.querySelector(".pv-color-ticks");

    this._statusCursor = this._element.querySelector(".pv-status-cursor");
    this._statusSelection = this._element.querySelector(".pv-status-selection");

    this._regionToggleCheckBox = this._element.querySelector(
      ".pv-region-toggle input",
    );

    this._downloadMatrix = this._element.querySelector(".pv-download-matrix");

    this._downloadSvg = this._element.querySelector(".pv-download-svg");

    this._root.appendChild(this._element);

    const rect = this._element.getBoundingClientRect();
    this._viewBox = { width: rect.width, height: rect.height };
    this._graph.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    this._graph.setAttribute("width", rect.width);
    this._graph.setAttribute("height", rect.height);

    // workaround for clients not supporting 'transform-origin', e.g. Safari
    const yLabel = this._graph.querySelector(".pv-axis-y-label");
    yLabel.removeAttribute("transform-origin");
    yLabel.setAttribute(
      "transform",
      `rotate(-90 ${-0.35 * this._viewBox.width}` +
        ` ${0.5 * this._viewBox.height})`,
    );

    if (colorRange !== null) {
      this._colorRange = colorRange;
    }

    if (paePalette !== null) {
      this._paePalette = paePalette;
    }

    this._updateStyle(style);
    this._insertStyleDefaults();

    for (const line of this._axesGroup.querySelectorAll("line")) {
      Utils.setAttributes(line, {
        stroke: this._style.elements.axes.color,
        "stroke-width": this._style.elements.axes.thickness,
      });
    }

    // in residue coordinates

    this._dim = 0;
    this._complex = null;

    this._resetSelection();

    this._crosslinkMarkers = [];
  }

  private _drawPaeColorScale(maxPae: any) {
    const colors = [];
    const numSteps = 10;

    for (let i = 0; i <= 10; i++) {
      colors.push(this._paePalette(i / numSteps).hex());
    }

    const gradient = `linear-gradient(to right, ${colors.join(", ")})`;
    const paeScale: any = document.querySelector(".pv-color-scale");
    paeScale.style.background = gradient;

    const maxTick = document.createElement("span");
    maxTick.textContent = maxPae;
    maxTick.style.left = "100%";
    this._paeScaleTicks.appendChild(maxTick);

    const interval = 0.05 * 10 ** Math.ceil(Math.log10(maxPae));

    for (
      let tickValue = 1;
      tickValue * interval <= maxPae - interval;
      tickValue++
    ) {
      const tick = document.createElement("span");
      const value = tickValue * interval;
      tick.textContent = value.toString();
      tick.style.left = `${(value / maxPae) * 100}%`;
      this._paeScaleTicks.appendChild(tick);
    }
  }

  private _isPrimitive = (x: any) => {
    return (
      typeof x === "string" || typeof x === "boolean" || typeof x === "number"
    );
  };

  private _updateStyle(style: any) {
    const updateObject = (base: any, update: any, keys: any = []) => {
      const [baseKeys, updateKeys] = [base, update].map(
        (obj) => new Set(Object.entries(obj).map(([key, _]) => key)),
      );

      const unrecognizedKeys = [
        ...new Set([...updateKeys].filter((key) => !baseKeys.has(key))),
      ];

      if (unrecognizedKeys.length > 0) {
        throw (
          `Unrecognized nested style attribute(s)` +
          ` '${unrecognizedKeys.join(", ")}'` +
          (keys.length > 0 ? ` in '${keys.join(".")}'` : "") +
          `!`
        );
      }

      const sharedKeys = new Set(
        [...baseKeys].filter((key) => updateKeys.has(key)),
      );

      for (const key of sharedKeys) {
        const newKeys = [...keys, key];

        if (typeof base[key] !== typeof update[key]) {
          throw (
            `Style attribute '${newKeys.join(".")}' with value` +
            ` '${update[key]}' should be of type` +
            ` '${typeof base[key]}', but has type` +
            ` '${typeof update[key]}'!`
          );
        }

        if (this._isPrimitive(base[key])) {
          base[key] = update[key];
        } else {
          updateObject(base[key], update[key], newKeys);
        }
      }
    };

    updateObject(this._style, style);
  }

  private _insertStyleDefaults() {
    const replacePlaceholders = (style: any, keys: any = []) => {
      for (const [key, value] of Object.entries(style)) {
        const newKeys = [...keys, key];

        if (this._isPrimitive(value)) {
          if (!(typeof value === "string" && value.startsWith("$"))) {
            continue;
          }

          const defaultsKey = value.slice(1);

          if (!this._style.defaults.hasOwnProperty(defaultsKey)) {
            throw (
              `Default value '${defaultsKey}' used for style` +
              ` attribute '${newKeys.join(".")}' doesn't` +
              ` exist!`
            );
          }

          // @ts-ignore
          style[key] = this._style.defaults[defaultsKey]! as any;
        } else {
          replacePlaceholders(value, newKeys);
        }
      }
    };

    replacePlaceholders(this._style.elements);
  }

  private _resetSelection() {
    this._selection = {
      rect: null,
      rectMarkers: [],
      startCoords: [],
      startMarkers: [],
      lines: [],
      rangeLines: [],
      rangeMarkers: [],
    };
  }

  getElement() {
    return this._element;
  }

  fetch(resource: any, options: any) {
    fetch(resource, options)
      .then((response) => response.json())
      .then(this.load.bind(this));
  }

  private _relative(coord: any) {
    return coord / this._dim;
  }

  load(complex: any, colorMapping = null) {
    const directory = `crosslinks/${complex.handle}/`;

    if (Object.hasOwn(complex, "pae") && Object.hasOwn(complex, "maxPae")) {
      this.createPaeImage(complex.pae, complex.maxPae).then((url) =>
        this._setPaeImage(url),
      );
    } else if (Object.hasOwn(complex, "paeImageUrl")) {
      this._setPaeImage(complex.paeImageUrl);
    } else {
      this._setPaeImage(directory + complex.handle + ".png");
    }

    this._drawPaeColorScale(complex.maxPae ?? 31.75);

    const sequenceLengths = complex.members.map((member: any) => member.length);
    this._dim = Utils.sum(sequenceLengths);
    this._complex = complex;

    // workaround to give unique IDs and names
    const uniprotCounts = new Map();

    for (const member of this._complex.members) {
      const count = (uniprotCounts.get(member.uniprot) ?? 0) + 1;
      uniprotCounts.set(member.uniprot, count);

      if (count > 1) {
        member.uniprot = `${member.uniprot}#${count}`;
        member.title = `${member.title}#${count}`;
      }
    }

    this._colorMapping = colorMapping;
    this._initColors(complex.members, colorMapping, this._colorRange);

    this._addDividers(sequenceLengths);
    this._addRegions(complex.members);
    this._addTicks(complex.members);

    if (complex.crosslinks) {
      this.addCrosslinks(complex.crosslinks, complex.members);
    } else if (complex.crosslinksUrl?.name.length > 0) {
      const reader = new FileReader();

      reader.addEventListener(
        "load",
        () => {
          try {
            this.addCrosslinks(
              Utils.readDSV(reader.result as string, null, ","),
              complex.members,
            );
          } catch (error) {
            console.error(error);
            alert("Couldn't load crosslinks from file!");
          }
        },
        false,
      );
      reader.addEventListener(
        "error",
        (error) => {
          console.error(error);
          alert("Couldn't load crosslinks from file!");
        },
        false,
      );

      reader.readAsText(complex.crosslinksUrl);
    } else if (complex.crosslinksFile) {
      fetch(directory + complex.crosslinksFile)
        .then((response) => response.text())
        .then((crosslinkTable) => {
          this.addCrosslinks(
            Utils.readDSV(crosslinkTable, null, ","),
            complex.members,
          );
        });
    }

    this.setupSelectionListeners();
    this._setupSvgDownloadListener();
  }

  private _getDownloadName() {
    if (this._complex?.structureFile) {
      const name =
        this._complex.structureFile.name ?? this._complex.structureFile;
      return name.split("/").pop().slice(0, name.lastIndexOf("."));
    } else {
      return this._complex.members.map((member: any) => member.title).join("-");
    }
  }

  private _setupSvgDownloadListener() {
    this._downloadSvg.addEventListener("click", (_: any) => {
      const svg = this._graph.cloneNode(true);

      svg.querySelector(".pv-selections").remove();
      svg.querySelector(".pv-regions").remove();

      // workaround for clients not supporting 'dominant-baseline',
      // e.g. Office applications (Word, PowerPoint)
      for (const text of svg.querySelectorAll(
        "text[dominant-baseline=central]",
      )) {
        const relativeY = parseFloat(text.getAttribute("y")) / 100;
        text.removeAttribute("dominant-baseline");
        text.setAttribute("y", relativeY * this._viewBox.height + 5);
      }

      const pad = { left: 25, right: 25, top: 25, bottom: 25 };
      const bbox = this._graph.getBBox();
      const width = bbox.width + pad.left + pad.right;
      const height = bbox.height + pad.top + pad.bottom;

      const outerSvg = svg.cloneNode(false);
      outerSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      outerSvg.setAttribute("width", width);
      outerSvg.setAttribute("height", height);

      const container = Utils.createSVG("g");
      container.setAttribute(
        "transform",
        `translate(${-bbox.x + pad.left}, ${-bbox.y + pad.top})`,
      );

      container.appendChild(svg);
      outerSvg.appendChild(container);

      const imageUrl = this._downloadMatrix.getAttribute("href");

      fetch(imageUrl)
        .then((response) => response.blob())
        .then((image) => {
          const reader = new FileReader();
          reader.readAsDataURL(image);

          reader.onloadend = () => {
            const paeMatrix = svg.querySelector(".pv-pae-matrix");
            paeMatrix.setAttribute("xlink:href", reader.result);
            paeMatrix.removeAttribute("href");

            saveAs(
              new Blob([outerSvg.outerHTML], {
                type: "image/svg+xml;charset=utf-8",
              }),
              this._getDownloadName() + ".svg",
            );
          };
        });
    });
  }

  private _setPaeImage(url: any) {
    this._paeMatrix.setAttribute("href", url);
    this._downloadMatrix.classList.remove("hidden");
    this._downloadMatrix.setAttribute("href", url);

    this._downloadMatrix.setAttribute("download", this._getImageName(url));
  }

  private _getImageName(url: any) {
    if (url.startsWith("blob:")) {
      return this._getDownloadName() + "_pae.png";
    } else {
      return url.split("/").pop();
    }
  }

  createPaeImage(pae: any, paeMax: any) {
    const dim = pae.length;
    const raw = new Uint8ClampedArray(dim * dim * 4);

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const coord = (y * dim + x) * 4;
        const value = pae[y][x];
        const color = this._paePalette(value / paeMax)._rgb;

        for (const [i, colorValue] of color.slice(0, 3).entries()) {
          raw[coord + i] = colorValue;
        }

        raw[coord + 3] = 255;
      }
    }

    return createImageBitmap(new ImageData(raw, dim))
      .then((bitmap) => {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("bitmaprenderer");
        ctx!.transferFromImageBitmap(bitmap);

        return new Promise((resolve) => canvas.toBlob(resolve));
      })
      .then(URL.createObjectURL as any);
  }

  private _initColors(
    subunits: any,
    colorMapping: any = null,
    colorRange: any = null,
  ) {
    if (colorMapping !== null) {
      for (const subunit of subunits.entries()) {
        subunit.color = colorMapping[subunit.uniprot];
      }
    } else if (colorRange !== null) {
      if (Array.isArray(colorRange)) {
        for (const [i, subunit] of subunits.entries()) {
          subunit.color = colorRange[i % colorRange.length];
        }
      } else {
        for (const [i, subunit] of subunits.entries()) {
          subunit.color = colorRange(i);
        }
      }
    }
  }

  private _addDividers(sequenceLengths: any) {
    let offset = 0;

    for (const length of sequenceLengths.slice(0, -1)) {
      const ratio = this._relative(length);

      for (const coord of ["x", "y"]) {
        const otherCoord = { x: "y", y: "x" }[coord];
        const extent = Utils.toPercentage(offset + ratio);

        const line = Utils.createSVG("line", "pv-dividers", {
          stroke: this._style.elements.dividers.color,
          "stroke-width": this._style.elements.dividers.thickness,
          [coord + 1]: extent,
          [coord + 2]: extent,
          [otherCoord! + 1]: "0",
          [otherCoord! + 2]: "100%",
        });
        this._dividerGroup.appendChild(line);
      }

      offset += ratio;
    }
  }

  private _addRegions(subunits: any) {
    const lengths = subunits.map((subunit: any) =>
      this._relative(subunit.length),
    );
    const offsets = [0, ...Utils.cumsum(lengths.slice(0, -1))];
    const indices = [...Array(subunits.length).keys()];
    const names = subunits.map((subunit: any) => subunit.title);

    // create stripe patterns for individual regions
    const getPatternId = (i: any, j: any) =>
      `stripes-${[i, j]
        .sort()
        .map((x) => names[x])
        .join("-")}`;

    for (let i = 0; i < subunits.length; i++) {
      for (let j = i + 1; j < subunits.length; j++) {
        const stripes = this._stripePattern.cloneNode(true);
        stripes.querySelector("rect").setAttribute("fill", subunits[i].color);
        stripes.querySelector("line").setAttribute("stroke", subunits[j].color);
        stripes.setAttribute("id", getPatternId(i, j));
        this._graphDefs.appendChild(stripes);
      }
    }

    const regionSelections = new Map();
    const createRegionSelection = (index: any) => ({
      range: [
        [subunits[index].uniprot, 1],
        [subunits[index].uniprot, subunits[index].length],
      ],
      color: subunits[index].color,
    });

    for (const [x, y] of Utils.cartesian(indices, indices)) {
      const region = Utils.createSVG("g", "pv-region", {
        opacity: this._style.elements.regions.opacity,
      });
      const id = `${names[x]}-${names[y]}`;
      region.dataset.id = id;

      this._regionGroup.appendChild(region);

      const background = Utils.createSVG("rect", null, {
        x: Utils.toPercentage(offsets[x]),
        y: Utils.toPercentage(offsets[y]),
        width: Utils.toPercentage(lengths[x]),
        height: Utils.toPercentage(lengths[y]),
      });

      region.appendChild(background);

      const labelX = offsets[x] + lengths[x] / 2;
      const labelY = offsets[y] + lengths[y] / 2;
      const fontSize = this._style.elements.regions.fontSize as any as number;

      const label = Utils.createSVG("text", null, {
        x: Utils.toPercentage(labelX),
        y: Utils.toPercentage(labelY),
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "font-size": (fontSize as any as number) * this._viewBox.height,
        "font-family": this._style.general.fontFamily,
      });

      if (x === y) {
        background.setAttribute("fill", subunits[x].color);
        label.textContent = names[x];
        region.appendChild(label);
        region.insertBefore(
          this._createBackgroundBox(
            (label as any).getBBox(),
            0.2 * (fontSize as any as number),
          ),
          label,
        );

        const selection = createRegionSelection(x);

        let meanPae = null;

        if (this._complex.pae) {
          meanPae = this._calcMeanPae(
            ...(selection.range as [any, any]),
            ...(selection.range as [any, any]),
          );
        }

        regionSelections.set(id, {
          type: "single",
          selection: createRegionSelection(x),
          meanPae: meanPae,
        });
      } else {
        background.setAttribute("fill", `url(#${getPatternId(x, y)})`);

        if (lengths[x] >= lengths[y]) {
          label.textContent = `${names[x]} / ${names[y]}`;
          region.appendChild(label);
          region.insertBefore(
            this._createBackgroundBox(
              (label as any).getBBox(),
              0.2 * (fontSize as any as number),
            ),
            label,
          );
        } else {
          label.textContent = "/";

          const upper = Utils.createSVG("text");
          const lower = Utils.createSVG("text");

          upper.textContent = names[x];
          lower.textContent = names[y];

          for (const text of [upper, lower]) {
            Utils.setAttributes(text, {
              x: Utils.toPercentage(labelX),
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              "font-size": fontSize * this._viewBox.height,
              "font-family": this._style.general.fontFamily,
            });
          }

          upper.setAttribute("y", Utils.toPercentage(labelY - fontSize));
          lower.setAttribute("y", Utils.toPercentage(labelY + fontSize));

          region.append(upper, label, lower);
          const upperBox = (upper as any).getBBox();
          const lowerBox = (lower as any).getBBox();

          const combinedBox = {
            x: Math.min(upperBox.x, upperBox.x),
            y: upperBox.y,
            width: Math.max(upperBox.width, upperBox.width),
            height: lowerBox.y + lowerBox.height - upperBox.y,
          };

          region.insertBefore(
            this._createBackgroundBox(combinedBox, 0.2 * fontSize),
            upper,
          );
        }

        const selectionX = createRegionSelection(x);
        const selectionY = createRegionSelection(y);

        let meanPae = null;

        if (this._complex.pae) {
          meanPae = this._calcMeanPae(
            ...(selectionX.range as [any, any]),
            ...(selectionY.range as [any, any]),
          );
        }

        regionSelections.set(id, {
          type: "pair",
          selection: {
            x: selectionX,
            y: selectionY,
          },
          meanPae: meanPae,
        });
      }
    }

    this.displayRegions(false);

    const toggleRegions = () =>
      this.displayRegions(
        (this._isShiftKeyDown && this._isCursorOnGraph) ||
          this._regionToggleCheckBox.checked,
      );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Shift") {
        this._isShiftKeyDown = true;

        if (this._isCursorOnGraph) {
          this._regionToggleCheckBox.checked = true;
        }
      }

      toggleRegions();
    });

    document.addEventListener("keyup", (event) => {
      if (event.key === "Shift") {
        this._isShiftKeyDown = false;
        if (this._isCursorOnGraph) {
          this._regionToggleCheckBox.checked = false;
        }
      }

      toggleRegions();
    });

    document.addEventListener("mousemove", (event) => {
      this._isCursorOnGraph = this.isCursorOnGraph(event);

      this._updateCursorStatus(event);

      toggleRegions();
    });

    this._regionToggleCheckBox.addEventListener("change", (_: any) => {
      toggleRegions();
    });

    this._regionGroup.addEventListener("click", (event: any) => {
      const region = event.target.closest(".pv-region");

      if (region === null) {
        return;
      }

      this.deselectAll(true);
      this._selectedRegion?.classList.remove("pv-region-selected");
      this._selectedRegion = event.target.closest(".pv-region");
      this._selectedRegion.classList.add("pv-region-selected");

      const regionSelection = regionSelections.get(
        this._selectedRegion.dataset.id,
      );

      this._updateRegionSelectionStatus(regionSelection);

      this._element.dispatchEvent(
        new CustomEvent("pv-select-region", {
          bubbles: true,
          detail: {
            complex: this._complex,
            ...regionSelection,
          },
        }),
      );
    });

    this._regionGroup.addEventListener("mousedown", (event: any) => {
      event.stopPropagation();
    });
  }

  private _updateCursorStatus(event: any) {
    if (!this._isCursorOnGraph) {
      this._statusCursor.replaceChildren();
      return;
    }
    const coords = this.getRelativeMousePosition(event, false);

    const isCrosslink = event.target.classList.contains("pv-crosslink-marker");

    let residues;

    if (isCrosslink) {
      const crosslink = this._crosslinks[event.target.dataset.crosslinkId];

      residues = [
        [crosslink.get("Protein1"), parseInt(crosslink.get("SeqPos1"))],
        [crosslink.get("Protein2"), parseInt(crosslink.get("SeqPos2"))],
      ];
    } else {
      residues = coords.map(this._getResidueFromRelative.bind(this));
    }

    this._statusCursor.replaceChildren(
      this._getStatusAtCoords(residues[0], residues[1], isCrosslink),
    );
  }

  private _getStatusAtCoords(coordX: any, coordY: any, isCrosslink: any) {
    const fragment = new DocumentFragment();

    const [residueX, residueY] = this._getCoordStrings([coordX, coordY]);

    if (isCrosslink) {
      fragment.append(`Crosslink ${residueX.string} - ${residueY.string}`);

      if (this._complex.pae) {
        const meanPae =
          (this._complex.pae[residueY.index][residueX.index] +
            this._complex.pae[residueX.index][residueY.index]) /
          2;
        const paeDisplay = document.createElement("b");
        paeDisplay.textContent = `mean PAE: ${meanPae.toFixed(2)}`;
        fragment.append("; ", paeDisplay);
      }
    } else {
      const statusX = document.createElement("span");
      statusX.classList.add("pv-x");
      statusX.textContent = `X: ${residueX.string}`;

      const statusY = document.createElement("span");
      statusY.classList.add("pv-y");
      statusY.textContent = `Y: ${residueY.string}`;

      fragment.append(statusX, ", ", statusY);

      if (this._complex.pae) {
        const pae = this._complex.pae[residueY.index][residueX.index];
        const paeDisplay = document.createElement("b");
        paeDisplay.textContent = `PAE: ${pae.toFixed(2)}`;
        fragment.append("; ", paeDisplay);
      }
    }

    return fragment;
  }

  private _getCoordStrings(residues: any) {
    return residues.map(([uniprot, coord]: [any, any]) => {
      const member = this._complex.members.find(
        (member: any) => member.uniprot === uniprot,
      );

      return {
        string: PaeViewer.residueToString(member, coord),
        index: member.offset + coord - 1,
      };
    });
  }

  displayRegions(show: any) {
    this._regionGroup.setAttribute("visibility", show ? "visible" : "hidden");
  }

  private _getResidueFromRelative(coord: any) {
    coord = Math.ceil(coord * this._dim);

    if (coord === 0) coord++;

    let uniprot = null;

    for (const member of this._complex.members) {
      uniprot = member.uniprot;
      if (coord <= member.length) break;

      coord -= member.length;
    }

    return [uniprot, coord];
  }

  getRelativeMousePosition(mouseEvent: any, clamped: any = true) {
    const rect = this._paeMatrix.getBoundingClientRect();

    const coords = [
      (mouseEvent.clientX - rect.left) / (rect.right - rect.left),
      (mouseEvent.clientY - rect.top) / (rect.bottom - rect.top),
    ];

    if (clamped) {
      return coords.map((coord) => Utils.clamp(coord, 0, 1));
    } else {
      return coords;
    }
  }

  isCursorOnGraph(mouseEvent: any) {
    const coords = this.getRelativeMousePosition(mouseEvent, false);

    for (const coord of coords) {
      if (coord < 0 || coord > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Updates the coordinates of the bounding lines of the selection
   * rectangle between point `from` (f) and `to`(t).
   * The lines will be drawn as follows:
   *
   *  y^               d     y^               d
   *   |              /       |              0
   *   |             /        |             /|
   *   |  t---O-----0         |      O-----0-t
   *   |  |   |    /          |      |    /  |
   *   |  O---f---0           |      f---0---O
   *   |  |   |  /            |      |  /
   *   |  |   | /             |      | /
   *   |  |   |/              |      |/
   *   |  |   0               |      0
   *   |  |  /                |     /
   *   |  | /                 |    /
   *   |  |/                  |   /
   *   |  0                   |  /
   *   | /                    | /
   *   |/                     |/
   *   +--------------->      +--------------->
   *                   x                      x
   * @param from
   * @param to
   */
  private _updateSelectionLines(from: any, to: any) {
    for (const [index, [axis, constantPoint]] of [
      ...Utils.cartesian(["x", "y"], [from, to]),
    ].entries()) {
      const i = axis === "x" ? 0 : 1;
      const j = 1 - i;
      const constantCoord = axis === "x" ? "y" : "x";
      const constant = constantPoint[j];

      const line = this._selection.lines[index];

      const [outer, inner] = [to[i], from[i]].sort(
        (a, b) => Math.abs(constant - b) - Math.abs(constant - a),
      );

      Utils.setAttributes(line, {
        [axis + 1]: Utils.toPercentage(outer),
        [axis + 2]: Utils.toPercentage(
          outer < constant
            ? Math.max(inner, constant)
            : Math.min(inner, constant),
        ),
        [constantCoord + 1]: Utils.toPercentage(constant),
        [constantCoord + 2]: Utils.toPercentage(constant),
      });
    }
  }

  private _updatedSelectionMarkers(from: any, to: any) {
    const inUpperHalf = (x: any, y: any) => y >= x;

    // start point is in upper left triangle
    const startInUpperHalf = inUpperHalf(from[0], from[1]);

    // if start is in one half and end point (or one of the other
    // points created by constructing the rectangle) is in the
    // other, there is an overlap
    const otherPointsInUpperHalf = [
      [to[0], to[1]],
      [to[0], from[1]],
      [from[0], to[1]],
    ].map(([x, y]) => inUpperHalf(x, y));

    const overlap =
      (startInUpperHalf && !otherPointsInUpperHalf.every(Boolean)) ||
      (!startInUpperHalf && otherPointsInUpperHalf.some(Boolean));

    const style = this._style.elements.selection;
    const colors = [style.colors.x, style.colors.y];

    // make sure colors are correctly assigned to X and Y
    const [color1, color2] = from[1] >= from[0] ? colors : colors.reverse();

    const gradients =
      from[1] > from[0]
        ? ["rangeMarkerLower", "rangeMarkerUpper"]
        : ["rangeMarkerLowerReversed", "rangeMarkerUpperReversed"];

    const markerColors = [
      color1,
      ...(overlap
        ? gradients.map((gradient) => `url("#${gradient}")`)
        : [color1, color2]),
      color2,
    ];

    const markerCoords = [from[0], from[1], to[0], to[1]].sort();

    for (const [i, coord] of markerCoords.entries()) {
      const marker = this._selection.rangeMarkers[i];
      Utils.setAttributes(marker, {
        cx: Utils.toPercentage(coord),
        cy: Utils.toPercentage(coord),
        fill: markerColors[i],
      });
    }

    const lineColors = [color1, style.colors.overlap, color2];

    for (const [i, [start, end]] of [
      ...Utils.pairwise(markerCoords),
    ].entries()) {
      const line = this._selection.rangeLines[i];

      if (i === 1 && !overlap) {
        line.setAttribute("visibility", "hidden");
        continue;
      } else {
        line.setAttribute("visibility", "visible");
      }
      Utils.setAttributes(line, {
        x1: Utils.toPercentage(start),
        y1: Utils.toPercentage(start),
        x2: Utils.toPercentage(end),
        y2: Utils.toPercentage(end),
        stroke: lineColors[i],
      });
    }

    const coords = markerCoords.map(this._getResidueFromRelative.bind(this));

    const ranges = [coords.slice(0, 2), coords.slice(2, 4)];
    const [rangeX, rangeY] = startInUpperHalf ? ranges : ranges.reverse();

    const [fromResidueX, fromResidueY] = from.map(
      this._getResidueFromRelative.bind(this),
    );

    const [toResidueX, toResidueY] = to.map(
      this._getResidueFromRelative.bind(this),
    );

    return {
      x: { range: rangeX, color: style.colors.x },
      y: { range: rangeY, color: style.colors.y },
      overlap: overlap
        ? {
            range: coords.slice(1, 3),
            color: style.colors.overlap,
          }
        : null,
      from: { x: fromResidueX, y: fromResidueY },
      to: { x: toResidueX, y: toResidueY },
    };
  }

  setupSelectionListeners() {
    let lastMouseDownEvent: any = null;
    let selectingRange = false;

    this._interactiveGroup.addEventListener("mousedown", (event: any) => {
      this.deselectAll(false);

      event.stopPropagation();
      event.preventDefault();

      lastMouseDownEvent = event;
    });

    document.addEventListener("mouseup", (event: any) => {
      if (lastMouseDownEvent === null) return;

      event.stopPropagation();
      event.preventDefault();

      if (selectingRange) {
        this.selectRangeEnd(this.getRelativeMousePosition(event));

        selectingRange = false;
      } else {
        this.selectPoint(this.getRelativeMousePosition(lastMouseDownEvent));
      }

      lastMouseDownEvent = null;
    });

    document.addEventListener("mousemove", (event) => {
      if (lastMouseDownEvent === null) return;

      event.stopPropagation();
      event.preventDefault();

      if (selectingRange) {
        this.selectRangeUpdate(this.getRelativeMousePosition(event));
      } else {
        this.selectRangeStart(
          this.getRelativeMousePosition(event),
          this.getRelativeMousePosition(lastMouseDownEvent),
        );

        selectingRange = true;
      }
    });
  }

  selectPoint(point: any) {
    const [coordX, coordY] = point;
    const style = this._style.elements.selection;

    const lineTemplate = Utils.createSVG("line", "pv-selection-line", {
      stroke: style.lines.color,
      "stroke-width": style.lines.thickness,
      "stroke-dasharray": style.lines.dashLength,
      x2: Utils.toPercentage(coordX),
      y2: Utils.toPercentage(coordY),
    });

    for (const coord of point) {
      const line = lineTemplate.cloneNode(false);
      Utils.setAttributes(line as Element, {
        x1: Utils.toPercentage(coord),
        y1: Utils.toPercentage(coord),
      });
      this._selectionGroup.appendChild(line);
    }

    const markerTemplate = Utils.createSVG("circle", "pv-selection-marker", {
      stroke: style.markers.outlineColor,
      "stroke-width": style.markers.outlineThickness,
      r: style.markers.size,
    });

    for (const [color, cx, cy] of [
      ["white", coordX, coordY],
      [style.colors.x, coordX, coordX],
      [style.colors.y, coordY, coordY],
    ]) {
      const marker = markerTemplate.cloneNode(false);
      Utils.setAttributes(marker as Element, {
        cx: Utils.toPercentage(cx),
        cy: Utils.toPercentage(cy),
        fill: color,
      });
      this._selectionGroup.appendChild(marker);
    }

    const [selectionX, selectionY] = [coordX, coordY].map(
      this._getResidueFromRelative.bind(this),
    );

    this._statusSelection.replaceChildren(
      this._getStatusAtCoords(selectionX, selectionY, false),
    );

    this._element.dispatchEvent(
      new CustomEvent("pv-select-residue-pair", {
        bubbles: true,
        detail: {
          complex: this._complex,
          selection: {
            x: { residue: selectionX, color: style.colors.x },
            y: { residue: selectionY, color: style.colors.y },
          },
        },
      }),
    );
  }

  setRect(rect: any, x1: any, y1: any, x2: any, y2: any) {
    const [rectX1, rectX2] = [x1, x2].sort();
    const [rectY1, rectY2] = [y1, y2].sort();

    Utils.setAttributes(rect, {
      x: Utils.toPercentage(rectX1),
      y: Utils.toPercentage(rectY1),
      width: Utils.toPercentage(rectX2 - rectX1),
      height: Utils.toPercentage(rectY2 - rectY1),
    });
  }

  selectRangeStart(from: any, to: any) {
    const style = this._style.elements.selection;
    this._selection.start = from;

    const rect = Utils.createSVG("rect", "pv-selection-rect", {
      fill: style.rect.color,
      opacity: style.rect.opacity,
      stroke: "none",
    });
    this.setRect(rect, ...from as [any, any], ...to as [any, any]);
    this._selection.rect = rect;
    this._selectionGroup.appendChild(rect);
    this._selection.lines = [];

    const lineTemplate = Utils.createSVG("line", "pv-selection-line", {
      stroke: style.lines.color,
      "stroke-width": style.lines.thickness,
      "stroke-dasharray": style.lines.dashLength,
    });

    for (let i = 0; i < 4; i++) {
      const line = lineTemplate.cloneNode(false);
      this._selectionGroup.appendChild(line);
      this._selection.lines.push(line);
    }

    this._updateSelectionLines(from, to);

    const markerTemplate = Utils.createSVG("circle", "pv-selection-marker", {
      fill: style.markers.outlineColor,
      stroke: style.markers.outlineColor,
      "stroke-width": style.markers.outlineThickness,
      r: style.markers.size,
    });
    this._selection.rangeMarkers = [];

    for (let i = 0; i < 4; i++) {
      const marker = markerTemplate.cloneNode(false);
      this._selectionGroup.appendChild(marker);
      this._selection.rangeMarkers.push(marker);
    }

    const rangeLineTemplate = Utils.createSVG("line", "pv-range-line", {
      "stroke-width": style.lines.thickness,
    });
    this._selection.rangeLines = [];

    for (let i = 0; i < 3; i++) {
      const line = rangeLineTemplate.cloneNode(false);
      this._selectionGroup.appendChild(line);
      this._selection.rangeLines.push(line);
    }

    const rangeSelection = this._updatedSelectionMarkers(from, to);

    const startMarker = markerTemplate.cloneNode(false);
    Utils.setAttributes(startMarker as Element, {
      cx: Utils.toPercentage(from[0]),
      cy: Utils.toPercentage(from[1]),
    });
    this._selectionGroup.appendChild(startMarker);

    this._selection.rectMarkers = [];

    // rectangle markers
    for (const [cx, cy] of [
      [to[0], to[1]],
      [from[0], to[1]],
      [to[0], from[1]],
    ]) {
      const marker = markerTemplate.cloneNode(false);
      Utils.setAttributes(startMarker as Element, {
        cx: Utils.toPercentage(cx),
        cy: Utils.toPercentage(cy),
      });
      this._selectionGroup.appendChild(marker);
      this._selection.rectMarkers.push(marker);
    }

    this.updateRangeSelectionStatus(rangeSelection);
  }

  updateRangeSelectionStatus(selection: any) {
    const residuesX = this._getCoordStrings(selection.x.range);
    const residuesY = this._getCoordStrings(selection.y.range);

    const statusX = document.createElement("span");
    statusX.classList.add("pv-x");
    statusX.textContent = `X: ${residuesX[0].string} - ${residuesX[1].string}`;

    const statusY = document.createElement("span");
    statusY.classList.add("pv-y");
    statusY.textContent = `Y: ${residuesY[0].string} - ${residuesY[1].string}`;

    this._statusSelection.replaceChildren(statusX, ", ", statusY);

    if (selection.overlap !== null) {
      const residuesOverlap = this._getCoordStrings(selection.overlap.range);

      const statusOverlap = document.createElement("span");
      statusOverlap.classList.add("pv-overlap");
      statusOverlap.textContent =
        `Overlap: ${residuesOverlap[0].string}` +
        ` - ${residuesOverlap[1].string}`;

      this._statusSelection.append(", ", statusOverlap);
    }
  }

  private _updateRegionSelectionStatus(region: any) {
    this._statusSelection.replaceChildren();

    const createMarker = (selection: any) => {
      const marker = document.createElement("span");
      marker.classList.add("pv-color-marker");
      marker.style.backgroundColor = selection.color;

      const member = this._complex.members.find(
        (member: any) => member.uniprot === selection.range[0][0],
      );

      marker.textContent = member.title;
      return marker;
    };

    if (region.type === "single") {
      this._statusSelection.append("chain", createMarker(region.selection));
    } else {
      const [chainX, chainY] = [region.selection.x, region.selection.y].map(
        createMarker,
      );

      this._statusSelection.append("chains ", chainX, " / ", chainY);
    }

    if (region.meanPae !== null) {
      const paeDisplay = document.createElement("b");
      paeDisplay.textContent = `mean PAE: ${region.meanPae.toFixed(2)}`;

      this._statusSelection.append("; ", paeDisplay);
    }
  }

  selectRangeUpdate(to: any) {
    const from = this._selection.start;

    this.setRect(this._selection.rect, ...from as [any, any], ...to as [any, any]);

    // rectangle markers
    for (const [i, [cx, cy]] of [
      [to[0], to[1]],
      [from[0], to[1]],
      [to[0], from[1]],
    ].entries()) {
      const marker = this._selection.rectMarkers[i];
      Utils.setAttributes(marker, {
        cx: Utils.toPercentage(cx),
        cy: Utils.toPercentage(cy),
      });
    }

    this._updateSelectionLines(from, to);

    const rangeSelection = this._updatedSelectionMarkers(from, to);
    this.updateRangeSelectionStatus(rangeSelection);

    return rangeSelection;
  }

  selectRangeEnd(to: any) {
    const selection = this.selectRangeUpdate(to);

    this._element.dispatchEvent(
      new CustomEvent("pv-select-residue-range", {
        bubbles: true,
        detail: {
          complex: this._complex,
          selection: selection,
        },
      }),
    );

    if (this._complex.pae) {
      // calculate mean of 2D slice of PAE matrix
      const meanPae = this._calcMeanPae(
        selection.from.x,
        selection.to.x,
        selection.from.y,
        selection.to.y,
      );

      const paeDisplay = document.createElement("b");
      paeDisplay.textContent = `mean PAE: ${meanPae.toFixed(2)}`;

      this._statusSelection.append("; ", paeDisplay);
    }
  }

  private _calcMeanPae(
    residueX1: any,
    residueX2: any,
    residueY1: any,
    residueY2: any,
  ) {
    const sortNumerically = (a: any, b: any) => a - b;

    const [x1, x2] = this._getCoordStrings([residueX1, residueX2])
      .map((residue: any) => residue.index)
      .sort(sortNumerically);

    const [y1, y2] = this._getCoordStrings([residueY1, residueY2])
      .map((residue: any) => residue.index)
      .sort(sortNumerically);

    // calculate mean of 2D slice of PAE matrix
    return Utils.mean(
      this._complex.pae
        .slice(y1, y2 + 1)
        .map((row: any) => row.slice(x1, x2 + 1))
        .flat(),
    );
  }

  private _addTick(
    rootTick: any,
    rootLabel: any,
    axis: any,
    value: any,
    offset: any,
    tickLength: any,
    text: any = null,
  ) {
    const otherAxis = axis === "x" ? "y" : "x";
    const anchor = axis === "x" ? "middle" : "end";
    const baseline = axis === "x" ? "auto" : "central";

    const ratio = this._relative(value + offset);

    const tick = Utils.createSVG("line", null, {
      stroke: this._style.elements.ticks.color,
      "stroke-width": this._style.elements.ticks.thickness,
      [axis + 1]: "0",
      [axis + 2]: Utils.toPercentage(-tickLength),
      [otherAxis + 1]: Utils.toPercentage(ratio),
      [otherAxis + 2]: Utils.toPercentage(ratio),
    });

    const labelCoords = [
      ratio,
      -(tickLength + this._style.elements.ticks.labelGap),
    ];

    rootTick.appendChild(tick);
    this._addTickLabel(
      rootLabel,
      ...(axis === "x" ? labelCoords : labelCoords.reverse()) as [any, any],
      text !== null ? text : value,
      anchor,
      baseline,
    );
  }

  private _addTicks(members: any) {
    let offset = 0;
    let lastSubunit = null;
    const style = this._style.elements;
    const interval = style.ticks.unitInterval;

    this._addTickLabel(
      this._axesGroup,
      -style.ticks.labelGap,
      -style.ticks.labelGap,
      "0",
      "end",
      "auto",
      false,
    );

    // add tick marks for both axes
    for (const [i, member] of members.entries()) {
      for (const axis of ["x", "y"]) {
        // add value ticks as multiples of interval
        for (
          let value = interval;
          // prevents overlap
          value < member.length - 0.1 * interval;
          value += interval
        ) {
          this._addTick(
            this._unitTicksGroup,
            this._unitTickLabelsGroup,
            axis,
            value,
            offset,
            style.ticks.units.length,
          );
        }

        // add complex subunit ticks
        this._addTick(
          this._sequenceTicksGroup,
          this._sequenceTickLabelsGroup,
          axis,
          member.length,
          offset,
          style.ticks.subunits.length,
          member.length + (i < members.length - 1 ? " / 0" : ""),
        );

        const labelCoords = [
          this._relative(offset + member.length / 2),
          -style.subunitLabels.gap,
        ];

        this._addTickLabel(
          this._sequenceTickLabelsGroup,
          ...(axis === "x" ? labelCoords : labelCoords.reverse()) as [any, any],
          member.title,
          ...(axis === "x" ? ["middle", "auto"] : ["end", "central"]) as [any, any],
          true,
          {
            "font-weight": style.subunitLabels.fontWeight,
            "font-style": style.subunitLabels.fontStyle,
            fill: style.subunitLabels.color,
          },
          { fill: members[i].color },
        );
      }

      offset += member.length;
      lastSubunit = member.length;
    }
  }

  private _createBackgroundBox(
    box: any,
    horizontalPadding: any = 0,
    verticalPadding: any = 0,
    params: any = {},
  ) {
    horizontalPadding = horizontalPadding * this._viewBox.width;
    verticalPadding = verticalPadding * this._viewBox.height;

    return Utils.createSVG("rect", null, {
      rx: this._style.elements.boxes.roundness,
      fill: this._style.elements.boxes.color,
      opacity: this._style.elements.boxes.opacity,
      x: Utils.toPercentage((box.x - horizontalPadding) / this._viewBox.width),
      y: Utils.toPercentage((box.y - verticalPadding) / this._viewBox.height),
      width: Utils.toPercentage(
        (box.width + 2 * horizontalPadding) / this._viewBox.width,
      ),
      height: Utils.toPercentage(
        (box.height + 2 * verticalPadding) / this._viewBox.height,
      ),
      ...params,
    });
  }

  private _addTickLabel(
    root: any,
    x: any,
    y: any,
    text: any,
    anchor: any,
    baseline: any,
    addBackground = true,
    params = {},
    backgroundParams = {},
  ) {
    const fontSize = this._style.elements.ticks.fontSize as any as number;

    const label = Utils.createSVG("text", "pv-tick-label", {
      x: Utils.toPercentage(x),
      y: Utils.toPercentage(y),
      "text-anchor": anchor,
      "dominant-baseline": baseline,
      "font-size": fontSize * this._viewBox.height,
      "font-family": this._style.general.fontFamily,
      ...params,
    });
    label.textContent = text;
    root.appendChild(label);

    if (addBackground) {
      const background = this._createBackgroundBox(
        (label as any).getBBox(),
        0.1 * fontSize,
        0,
        backgroundParams,
      );
      root.insertBefore(background, label);
    }
  }

  addCrosslinks(crosslinks: any, members: any) {
    this._crosslinks = crosslinks;
    let offset = 0;

    for (const member of members) {
      member["offset"] = offset;
      offset += member.length;
    }

    members = new Map(members.map((member: any) => [member.uniprot, member]));
    const style = this._style.elements.crosslinks;

    this._crosslinkMarkers = [];

    for (const [id, crosslink] of crosslinks.entries()) {
      const restraintSatisfied = crosslink.has("RestraintSatisfied")
        ? crosslink.get("RestraintSatisfied").toLowerCase() === "true"
        : true;

      const color = restraintSatisfied
        ? style.restraintColors.satisfied
        : style.restraintColors.violated;

      const coords = [1, 2].map((i) => {
        const uniprot = crosslink.get("Protein" + i);
        return this._relative(
          members.get(uniprot)["offset"] +
            parseInt(crosslink.get("SeqPos" + i)),
        );
      });

      const markerPair = [];

      for (const [coord1, coord2] of [coords, [...coords].reverse()]) {
        const crosslinkMarker = Utils.createSVG(
          "circle",
          "pv-crosslink-marker",
          {
            r: style.size,
            stroke: style.outlineColor,
            "stroke-width": style.outlineThickness,
            opacity: style.opacity,
            "data-crosslink-id": id,
            cx: Utils.toPercentage(coord1),
            cy: Utils.toPercentage(coord2),
            fill: color,
          },
        );

        this._crosslinkGroup.appendChild(crosslinkMarker);

        markerPair.push(crosslinkMarker);
      }

      this._crosslinkMarkers.push(markerPair);
    }

    this._crosslinkGroup.addEventListener("mousedown", (event: any) => {
      event.stopPropagation();
    });

    this._crosslinkGroup.addEventListener("click", (event: any) => {
      if (!event.target.classList.contains("pv-crosslink-marker")) {
        return;
      }

      event.stopPropagation();
      const id = event.target.dataset.crosslinkId;
      this.deselectAll(true);

      for (const markerPair of this._crosslinkMarkers) {
        for (const marker of markerPair) {
          marker.classList.add("pv-crosslink-unselected");
          marker.classList.remove("pv-crosslink-selected");
        }
      }

      for (const marker of this._crosslinkMarkers[id]) {
        marker.classList.remove("pv-crosslink-unselected");
        marker.classList.add("pv-crosslink-selected");
      }

      const crosslink = this._crosslinks[id];

      const [residue1, residue2] = [
        [crosslink.get("Protein1"), parseInt(crosslink.get("SeqPos1"))],
        [crosslink.get("Protein2"), parseInt(crosslink.get("SeqPos2"))],
      ];

      this._statusSelection.replaceChildren(
        this._getStatusAtCoords(residue1, residue2, true),
      );

      this._element.dispatchEvent(
        new CustomEvent("pv-select-crosslink", {
          bubbles: true,
          detail: {
            complex: this._complex,
            selection: {
              id: event.target.dataset.crosslinkId,
              residue1: residue1,
              residue2: residue2,
            },
          },
        }),
      );
    });

    this._crosslinkGroup.addEventListener("mouseover", (event: any) => {
      const id = event.target.dataset.crosslinkId;

      for (const marker of this._crosslinkMarkers[id]) {
        marker.classList.add("pv-crosslink-hover");
      }
    });

    this._crosslinkGroup.addEventListener("mouseout", (event: any) => {
      const id = event.target.dataset.crosslinkId;

      for (const marker of this._crosslinkMarkers[id]) {
        marker.classList.remove("pv-crosslink-hover");
      }
    });
  }

  private _dispatchSelectionReset() {
    this._element.dispatchEvent(
      new CustomEvent("pv-reset-selection", {
        bubbles: true,
        detail: {
          complex: this._complex,
        },
      }),
    );
  }

  deselectAll(dispatchEvent = true) {
    if (dispatchEvent) {
      this._dispatchSelectionReset();
    }

    for (const markerPair of this._crosslinkMarkers) {
      for (const marker of markerPair) {
        marker.classList.remove("pv-crosslink-unselected");
        marker.classList.remove("pv-crosslink-selected");
      }
    }

    this._resetSelection();

    this._selectedRegion?.classList!.remove("pv-region-selected");
    this._selectedRegion = null;

    this._selectionGroup.replaceChildren();
    this._statusSelection.replaceChildren();
  }

  static residueToString(member: any, index: any) {
    const residue = member.sequence[index - 1];

    return `${residue.name} ${index} (${member.title})`;
  }
}

const template = `
<template id="pae-viewer-template">
  <div class="pae-viewer">
    <svg class="pv-graph"
         xmlns="http://www.w3.org/2000/svg"
         overflow="visible"
    >
      <defs>
        <linearGradient id="rangeMarkerLower"
                        gradientTransform="rotate(45 0.5 0.5)">
          <stop offset="0%"  stop-color="cyan" />
          <stop offset="50%" stop-color="cyan" />
          <stop offset="50%" stop-color="magenta" />
          <stop offset="100%" stop-color="magenta" />
        </linearGradient>
        <linearGradient id="rangeMarkerLowerReversed"
                        gradientTransform="rotate(45 0.5 0.5)">
          <stop offset="0%"  stop-color="orange" />
          <stop offset="50%" stop-color="orange" />
          <stop offset="50%" stop-color="magenta" />
          <stop offset="100%" stop-color="magenta" />
        </linearGradient>
        <linearGradient id="rangeMarkerUpper"
                        gradientTransform="rotate(45 0.5 0.5)">
          <stop offset="0%"  stop-color="magenta" />
          <stop offset="50%" stop-color="magenta" />
          <stop offset="50%" stop-color="orange" />
          <stop offset="100%" stop-color="orange" />
        </linearGradient>
        <linearGradient id="rangeMarkerUpperReversed"
                        gradientTransform="rotate(45 0.5 0.5)">
          <stop offset="0%"  stop-color="magenta" />
          <stop offset="50%" stop-color="magenta" />
          <stop offset="50%" stop-color="cyan" />
          <stop offset="100%" stop-color="cyan" />
        </linearGradient>
        <pattern id="stripes-template" patternUnits="userSpaceOnUse"
                 width="2%" height="2%" patternTransform="rotate(45)">
          <rect x="0" y="0" width="2%" height="2%" fill="red"></rect>
          <line x1="0" y1="0" x2="0" y2="2%"
                stroke="#00FF00" stroke-width="2%" />
        </pattern>
      </defs>

      <g class="pv-graph-area">
        <image
          class="pv-pae-matrix"
          width="100%"
          height="100%"
          style="image-rendering:pixelated"
        />
        <g class="pv-axes">
          <text class="pv-axis-x-label" x="50%" y="-25%" text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif">
            Scored residue / atom
          </text>
          <text class="pv-axis-y-label" x="-35%" y="50%" text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                transform-origin="-35% 50%" transform="rotate(-90)">
            Aligned residue / atom
          </text>
          <line class="pv-axis-x" x1="-5%" y1="0" x2="105%" y2="0"/>
          <line class="pv-axis-y" x1="0" y1="-5%" x2="0" y2="105%"/>
          <line class="pv-axis-diagonal" x1="0" y1="0" x2="102%" y2="102%"/>
          <g class="pv-sequence-ticks"></g>
          <g class="pv-unit-ticks"></g>
          <g class="pv-unit-tick-labels"></g>
          <g class="pv-sequence-tick-labels"></g>
        </g>
        <g class="pv-dividers"></g>
        <g class="pv-interactive-layer">
          <rect class="pv-backdrop" x="0" y="0"
                width="100%" height="100%" opacity="0" />
          <g class="pv-selections"></g>
          <g class="pv-crosslinks"></g>
          <g class="pv-regions"></g>
        </g>
      </g>
    </svg>
    <div class="pv-color-legend">
      <div class="pv-color-scale"></div>
      <div class="pv-color-ticks">
        <span style="position: relative">&nbsp;</span> <!-- placeholder -->
        <span style="left: 0%">0</span>
      </div>
      <div class="pv-color-legend-label">
        Expected position error (Ångströms)
      </div>
    </div>
    <div class="pv-status">
      <div>
        <div><b>Cursor</b>:</div>
        <div class="pv-status-cursor"></div>
      </div>
      <div>
        <div><b>Selection</b>:</div>
        <div class="pv-status-selection"></div>
      </div>
    </div>
    <div class="pv-region-toggle">
      <div>
        <label>
          <input type="checkbox" name="toggleRegion">
          toggle region overlay
        </label>
      </div>
      <div>
        <small>
          (alternatively, hold the 'Shift' key when the cursor is within
          the PAE Viewer)
        </small>
      </div>
    </div>
    <div class="d-flex flex-column align-items-center">
      <div class="m-2">
        <a class="pv-download-matrix btn btn-primary hidden" download>
          Download PAE matrix image
        </a>
      </div>
      <div class="m-2">
        <a class="pv-download-svg btn btn-primary" download>
          Download graph as SVG
        </a>
      </div>
    </div>
  </div>
</template>
`;

interface PaeViewerStyle {
  general: {
    fontFamily: string;
  };
  defaults: {
    chartColor: string;
    chartLineThickness: string;
    fontSize: string;
    selectionOutlineColor: string;
    markerOutlineColor: string;
    markerOutlineThickness: string;
    markerSize: string;
  };
  elements: {
    axes: {
      color: string;
      thickness: string;
    };
    boxes: {
      roundness: string;
      color: string;
      opacity: string;
    };
    dividers: {
      color: string;
      thickness: string;
    };
    ticks: {
      unitInterval: string;
      fontSize: string;
      color: string;
      thickness: string;
      labelGap: string;
      units: {
        length: string;
      };
      subunits: {
        length: string;
      };
    };
    subunitLabels: {
      gap: string;
      fontWeight: string;
      fontStyle: string;
      color: string;
    };
    regions: {
      opacity: string;
      fontSize: string;
    };
    selection: {
      lines: {
        color: string;
        thickness: string;
        dashLength: string;
      };
      markers: {
        outlineColor: string;
        outlineThickness: string;
        size: string;
      };
      rect: {
        color: string;
        opacity: string;
      };
      colors: {
        x: string;
        y: string;
        overlap: string;
      };
    };
    crosslinks: {
      outlineColor: string;
      outlineThickness: string;
      opacity: string;
      size: string;
      restraintColors: {
        satisfied: string;
        violated: string;
      };
    };
  };
}

// modified from Okabe_Ito
const subunitColors = [
  "#991999", // PyMol deeppurple (0.6, 0.1, 0.6)
  "#00BFBF", // PyMol teal (0, 0.75, 0.75)
  "#e9967a", // salmon
  "#009e73",
  "#f0e442",
  "#0072b2",
  "#d55e00",
  "#cc79a7",
];
