export class StyleUtils {
  public static sheetFromStyle(style: Style): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    for (const [selector, rules] of Object.entries(style)) {
      const ruleString = Object.entries(rules)
        .map(([attribute, value]) => `${attribute}: ${value}`)
        .join("; ");
      sheet.insertRule(`${selector} { ${ruleString} }`);
    }
    return sheet;
  }

  public static getStyleRulesAsText(sheet: CSSStyleSheet): string[] {
    return Array.from(sheet.cssRules).map((rule) => rule.cssText);
  }

  public static createVariableRule(id: string, value: string): string {
    return `:root {${StyleUtils.getVariableKey(id)}: ${value};}`;
  }

  public static getVariableKey(id: string): string {
    return `--pv-variable-${id}`;
  }

  public static getVariableValue(id: string): string {
    return `var(${StyleUtils.getVariableKey(id)})`;
  }
}

export interface Style extends Record<string, StyleRules> {
  [selector: string]: StyleRules;
}

export interface StyleRules extends Record<string, string> {
  [attribute: string]: string;
}
