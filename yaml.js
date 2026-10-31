// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/**
 * Object-oriented construction and presentation of YAML documents.
 *
 * @module yaml.js
 */

/**
 * @typedef PresentationOptions Options controlling YAML presentation.
 * @property {number} [indent=2] - The number of spaces in one indentation step.
 * @property {number} [level=0] - The current indentation level.
 * @property {Map<string, Node> | null} [aliasScope] - Mapping of anchor names to nodes.
 * Will be used to replace nodes with aliases, and will be populated with new nodes
 * that have anchors. Passing `null` here will disable aliasing. By default, a new scope
 * is allocated.
 * @see https://yaml.org/spec/1.2.2/#3222-anchors-and-aliases
 * @see https://yaml.org/spec/1.2.2/#61-indentation-spaces
 */

/**
 * Validate and normalize presentation options.
 *
 * @param {PresentationOptions} options - The options to normalize.
 * @returns {Required<PresentationOptions>} The normalized options.
 * @throws {RangeError | TypeError} When any options are not valid.
 */
function normalizeOptions({indent = 2, level = 0, aliasScope = new Map()}) {
    if (!Number.isInteger(indent) || indent < 1)
        throw new RangeError(`YAML indentation must be a positive integer, got: ${indent}`);

    if (!Number.isInteger(level) || level < 0)
        throw new RangeError(`YAML indentation level must be a non-negative integer, got: ${level}`);

    if (aliasScope !== null && !(aliasScope instanceof Map))
        throw new TypeError(`aliasScope expected to be a Map instance, got ${aliasScope} instead`);

    return {indent, level, aliasScope};
}

/**
 * Check whether a string consists of YAML printable characters (excluding BOM and NEL).
 *
 * @param {string} value - The string to check.
 * @returns {boolean} Whether every character is printable according to YAML.
 * @see https://yaml.org/spec/1.2.2/#rule-c-printable
 * @see https://yaml.org/spec/1.2.2/#rule-nb-char
 */
function isPrintable(value) {
    return /^[\t\n\r\x20-\x7e\xa0-\ud7ff\ue000-\ufefe\uff00-\ufffd\u{10000}-\u{10ffff}]*$/u
        .test(value);
}

/**
 * Check whether a string can use plain style without changing its type or content.
 *
 * @param {string} value - The string to check.
 * @returns {boolean} Whether plain style is safe.
 * @see https://yaml.org/spec/1.2.2/#733-plain-style
 */
function canUsePlainStyle(value) {
    if (value.length === 0 || !isPrintable(value) ||
        value !== value.trim() || /[\t\n\r]/u.test(value))
        return false;

    if (/^[!&*#{}[\],|>'"%@`]/u.test(value))
        return false;

    if (/^[-?:](?:\s|$)/u.test(value))
        return false;

    /* A plain scalar must not begin with a document marker:
       https://yaml.org/spec/1.2.2/#912-document-markers */
    if (/^(?:---|\.\.\.)(?:\s|$)/u.test(value))
        return false;

    if (/:(?:\s|$)|\s#/u.test(value))
        return false;

    /* Avoid implicit resolution as a non-string in the core schema:
       https://yaml.org/spec/1.2.2/#1032-tag-resolution */
    if (/^(?:~|null|true|false|[-+]?\.inf|\.nan)$/iu.test(value))
        return false;

    if (/^[-+]?(?:[0-9]+|0o[0-7]+|0x[0-9a-f]+)$/iu.test(value))
        return false;

    if (/^[-+]?(?:(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[-+]?[0-9]+)?)$/iu.test(value))
        return false;

    /* YAML 1.1 parsers resolve more plain scalars as ints/floats than the core
       schema: binary/octal/hex, '_' digit separators, and sexagesimal numbers.
       Quote anything matching those implicit resolvers, including spellings
       with '_' in the fraction or exponent.
       https://yaml.org/type/int.html, https://yaml.org/type/float.html */
    if (/^[-+]?(?:0b[01_]+|0[0-7_]+|0x[0-9a-f_]+|[0-9][0-9_]*)$/iu.test(value))
        return false;

    if (/^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/iu.test(value))
        return false;

    if (/^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?e[-+]?[0-9]+$/iu.test(value))
        return false;

    if (/^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+(?:\.[0-9_]*)?$/iu.test(value))
        return false;

    /* Also avoid timestamps and boolean words commonly resolved by YAML 1.1 parsers. */
    if (/^(?:y|n|yes|no|on|off)$/iu.test(value))
        return false;

    /* YAML 1.1 gives implicit tags to '=' (value) and '<<' (merge). Parsers
       without constructors for those tags reject the document outright. */
    if (value === '=' || value === '<<')
        return false;

    return !/^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(?:$|[Tt\s])/u.test(value);
}

/**
 * Present a string using single or double quotes, whichever needs fewer escapes.
 *
 * @param {string} value - The string to present.
 * @returns {string} The quoted scalar.
 * @see https://yaml.org/spec/1.2.2/#57-escaped-characters
 * @see https://yaml.org/spec/1.2.2/#731-double-quoted-style
 * @see https://yaml.org/spec/1.2.2/#732-single-quoted-style
 */
function quoteString(value) {
    const doubleQuoted = JSON.stringify(value).replace(
        /[\x7f-\x9f\ufeff\ufffe\uffff]/gu,
        ch => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
    );

    if (!isPrintable(value) || /[\t\n\r]/u.test(value))
        return doubleQuoted;

    const singleQuoted = `'${value.replaceAll("'", "''")}'`;

    return singleQuoted.length <= doubleQuoted.length ? singleQuoted : doubleQuoted;
}

/**
 * Check whether literal style can preserve a string exactly.
 *
 * @param {string} value - The string to check.
 * @param {number} indentation - The requested indentation step.
 * @returns {boolean} Whether literal style is safe.
 * @see https://yaml.org/spec/1.2.2/#8111-block-indentation-indicator
 * @see https://yaml.org/spec/1.2.2/#812-literal-style
 */
function canUseLiteralStyle(value, indentation) {
    if (!value.includes('\n') || value.includes('\r') || !isPrintable(value))
        return false;

    if (!/[^\n ]/u.test(value))
        return !value.includes(' ');

    /* An indentation indicator is required when content starts with spaces. */
    return indentation <= 9 || !/^\n*[ \t]/u.test(value);
}

/**
 * Present a string using literal style.
 *
 * @param {string} value - The string to present.
 * @param {number} indent - The number of spaces in one indentation step.
 * @param {number} level - The scalar's current indentation level.
 * @returns {string} The literal scalar.
 * @see https://yaml.org/spec/1.2.2/#811-block-scalar-headers
 * @see https://yaml.org/spec/1.2.2/#812-literal-style
 */
function literalString(value, indent, level) {
    const contentIndent = ' '.repeat(indent * (level + 1));
    const lines = value.split('\n');
    const trailingBreaks = value.length - value.replace(/\n+$/u, '').length;
    const indentationIndicator = /^\n*[ \t]/u.test(value) ? String(indent) : '';
    let chompingIndicator;

    if (trailingBreaks === 0)
        chompingIndicator = '-';
    else if (trailingBreaks === 1 && value.length > 1)
        chompingIndicator = '';
    else
        chompingIndicator = '+';

    if (trailingBreaks > 0)
        lines.pop();

    const content = lines.map(line => line ? `${contentIndent}${line}` : '');

    return [`|${indentationIndicator}${chompingIndicator}`, ...content].join('\n');
}

/**
 * @typedef NodeOptions Common node properties for all node types.
 * @property {string | null} [anchor=null] - An optional anchor name.
 * @see https://yaml.org/spec/1.2.2/#692-node-anchors
 */

/**
 * A base class for all YAML nodes.
 *
 * @see https://yaml.org/spec/1.2.2/#3211-nodes
 */
export class Node {
    #anchor;

    /**
     * @param {unknown} name
     * @returns {string | null}
     * @throws {Error} When the name is not valid.
     * @see https://yaml.org/spec/1.2.2/#rule-ns-anchor-char
     * @see https://yaml.org/spec/1.2.2/#rule-ns-anchor-name
     */
    static #validateAnchor(name) {
        if (name === null || name === undefined)
            return null;

        if (typeof name !== 'string')
            throw new TypeError('YAML anchor name must be a string');

        if (!isPrintable(name) || !/^[^\s,:[\]{}]+$/u.test(name))
            throw new Error(`Invalid YAML anchor name: ${JSON.stringify(name)}`);

        return name;
    }

    /**
     * Node's anchor name.
     *
     * @returns {string | null} - The anchor name, or null for no anchor.
     */
    get anchor() {
        return this.#anchor;
    }

    /**
     * Set anchor name for the node.
     */
    set anchor(anchor) {
        this.#anchor = Node.#validateAnchor(anchor);
    }

    /**
     * Create a node.
     *
     * @param {NodeOptions} [options] - Common node properties.
     */
    constructor({anchor = null} = {}) {
        this.#anchor = Node.#validateAnchor(anchor);
    }

    /**
     * Present this node as YAML.
     *
     * The returned strings are node fragments, not complete document streams.
     * They do not include document start/end markers. Add a final line break
     * when writing a root fragment to a document, especially when it ends
     * in a block scalar with clipped or kept line breaks. The first line
     * is never indented; continuation lines use the requested absolute
     * indentation level. This makes fragments easy to compose in parent nodes.
     *
     * @abstract
     * @param {PresentationOptions} [options] - Presentation options.
     * @returns {string} The YAML fragment.
     * @see https://yaml.org/spec/1.2.2/#322-serialization-tree
     * @see https://yaml.org/spec/1.2.2/#323-presentation-stream
     */
    toYaml(options = {}) { // eslint-disable-line @typescript-eslint/no-unused-vars
        throw new TypeError('Abstract method, not implemented');
    }

    /**
     * Present this node as a mapping key, including the trailing `:` indicator.
     *
     * @internal
     * @abstract
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing mapping.
     * @returns {string} The presented mapping key and `:` indicator.
     * @see https://yaml.org/spec/1.2.2/#822-block-mappings
     */
    asKey(options) { // eslint-disable-line @typescript-eslint/no-unused-vars
        throw new TypeError('Abstract method, not implemented');
    }

    /**
     * Present this node as a mapping value, including the leading separator after `:`.
     *
     * @internal
     * @abstract
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing mapping.
     * @returns {string} The leading separator and presented mapping value.
     * @see https://yaml.org/spec/1.2.2/#822-block-mappings
     */
    asValue(options) { // eslint-disable-line @typescript-eslint/no-unused-vars
        throw new TypeError('Abstract method, not implemented');
    }

    /**
     * Present this node as a sequence item.
     *
     * @internal
     * @abstract
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing collection.
     * @returns {string} The '-' indicator followed by the presented node.
     * @see https://yaml.org/spec/1.2.2/#821-block-sequences
     */
    asItem(options) { // eslint-disable-line @typescript-eslint/no-unused-vars
        throw new TypeError('Abstract method, not implemented');
    }
}

/**
 * Check if an alias should be used to present the node.
 *
 * @param {Node} node - The node.
 * @param {Map<string, Node> | null} scope - Mapping of anchor names to already processed nodes.
 * If the node has an anchor, it will be inserted into the map.
 * @returns {string | null} - The alias, or null if no suitable alias is found.
 * @see https://yaml.org/spec/1.2.2/#3222-anchors-and-aliases
 * @see https://yaml.org/spec/1.2.2/#71-alias-nodes
 */
function getAlias(node, scope) {
    if (!node.anchor || !scope)
        return null;

    if (scope.get(node.anchor) === node)
        return `*${node.anchor}`;

    scope.set(node.anchor, node);
    return null;
}

/**
 * @typedef {string | number | bigint | boolean | null} ScalarValue
 * A value that can be represented by a YAML scalar.
 */

/**
 * A YAML scalar node.
 *
 * Strings automatically use plain, quoted, or literal style. Other supported values are booleans,
 * null, numbers (including NaN and infinities), and bigints.
 *
 * @see https://yaml.org/spec/1.2.2/#3231-node-styles
 * @see https://yaml.org/spec/1.2.2/#1021-tags
 */
export class Scalar extends Node {
    #value;

    /**
     * @param {unknown} value
     * @throws {TypeError} If the value isn't acceptable for a scalar node.
     */
    static #validateValue(value) {
        if (value !== null && !['string', 'number', 'bigint', 'boolean'].includes(typeof value))
            throw new TypeError(`Unsupported YAML scalar value: ${String(value)}`);
    }

    /**
     * JS value represented by the node.
     *
     * @returns {ScalarValue} - The value.
     */
    get value() {
        return this.#value;
    }

    /**
     * Set JS value represented by the node.
     */
    set value(value) {
        Scalar.#validateValue(value);

        this.#value = value;
    }

    /**
     * Create a scalar node.
     *
     * @param {ScalarValue} value - The scalar value.
     * @param {NodeOptions} [options] - Common node properties.
     */
    constructor(value, options = {}) {
        super(options);

        Scalar.#validateValue(value);

        this.#value = value;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing mapping.
     */
    asKey(options) {
        const {indent, level} = options;
        const yaml = this.toYaml(options);

        if (!yaml.startsWith('*') && yaml.length <= 1024 && !yaml.includes('\n'))
            return `${yaml}:`;

        return `? ${yaml}\n${' '.repeat(indent * level)}:`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing mapping.
     */
    asValue(options) {
        return ` ${this.toYaml(options)}`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing collection.
     */
    asItem(options) {
        return `- ${this.toYaml(options)}`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {PresentationOptions} [options] - Presentation options.
     */
    toYaml(options = {}) {
        const {indent, level, aliasScope} = normalizeOptions(options);
        const alias = getAlias(this, aliasScope);

        if (alias)
            return alias;

        const prefix = this.anchor ? `&${this.anchor} ` : '';
        const {value} = this;

        if (typeof value === 'string') {
            if (canUsePlainStyle(value))
                return `${prefix}${value}`;

            if (canUseLiteralStyle(value, indent))
                return `${prefix}${literalString(value, indent, level)}`;

            return `${prefix}${quoteString(value)}`;
        }

        /* Non-string scalars use spellings that resolve back to the intended
           types under the core schema:
           https://yaml.org/spec/1.2.2/#1032-tag-resolution */
        if (value === null)
            return `${prefix}null`;

        if (typeof value === 'boolean' || typeof value === 'bigint')
            return `${prefix}${value}`;

        if (Number.isNaN(value))
            return `${prefix}.nan`;

        if (value === Infinity)
            return `${prefix}.inf`;

        if (value === -Infinity)
            return `${prefix}-.inf`;

        /* Write -0 as a float: -0 matches the core schema's integer pattern,
           so parsers resolve it back to a positive zero and lose the sign. */
        if (Object.is(value, -0))
            return `${prefix}-0.0`;

        return `${prefix}${value}`;
    }
}

/**
 * A base class for YAML collection nodes.
 *
 * @see https://yaml.org/spec/1.2.2/#82-block-collection-styles
 */
export class Collection extends Node {
    /**
     * Presentation of this collection when it is empty.
     *
     * @type {string}
     * @internal
     * @readonly
     * @abstract
     */
    static EMPTY_YAML;

    /**
     * Check whether this collection has no items or entries.
     *
     * @abstract
     * @returns {boolean} Whether the collection is empty.
     */
    isEmpty() {
        throw new TypeError('Abstract method, not implemented');
    }

    /**
     * Format the elements or entries of this collection as YAML fragments.
     *
     * @abstract
     * @param {Required<PresentationOptions>} options - Presentation options.
     * @returns {string[]} The formatted items.
     * @protected
     */
    getItems(options) { // eslint-disable-line @typescript-eslint/no-unused-vars
        throw new TypeError('Abstract method, not implemented');
    }

    /**
     * Present this node following a block collection indicator (`-` or `?`).
     *
     * @param {"-" | "?"} indicator - The block indicator character.
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing collection.
     */
    #asBlock(indicator, options) {
        const {indent, level, aliasScope} = options;

        if (indent === 1 || this.anchor || this.isEmpty())
            return `${indicator}${this.asValue(options)}`;

        const yaml = this.toYaml({indent, level: level + 1, aliasScope});

        return `${indicator}${' '.repeat(indent - 1)}${yaml}`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing mapping.
     */
    asKey(options) {
        const {indent, level} = options;

        return `${this.#asBlock('?', options)}\n${' '.repeat(indent * level)}:`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {PresentationOptions} [options] - Presentation options of the containing mapping.
     */
    asValue(options = {}) {
        const {indent, level, aliasScope} = normalizeOptions(options);
        const yaml = this.toYaml({indent, level: level + 1, aliasScope});

        if (!this.anchor && !this.isEmpty())
            return `\n${' '.repeat(indent * (level + 1))}${yaml}`;

        return ` ${yaml}`;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options
     * of the containing collection.
     */
    asItem(options) {
        return this.#asBlock('-', options);
    }

    /**
     * @inheritdoc
     * @override
     * @param {PresentationOptions} [options] - Presentation options.
     */
    toYaml(options = {}) {
        const normOptions = normalizeOptions(options);
        const alias = getAlias(this, normOptions.aliasScope);

        if (alias)
            return alias;

        const prefix = this.anchor ? `&${this.anchor}` : '';

        if (this.isEmpty()) {
            const empty = /** @type {typeof Collection} */ (this.constructor).EMPTY_YAML;

            return prefix ? `${prefix} ${empty}` : empty;
        }

        const items = this.getItems(normOptions);
        const indentation = ' '.repeat(normOptions.indent * normOptions.level);
        const body = items.join(`\n${indentation}`);

        return prefix ? `${prefix}\n${indentation}${body}` : body;
    }
}

/**
 * A YAML mapping node. Keys and values are nodes, so keys may be arbitrarily complex.
 *
 * @remarks
 * Keys in `this.entries` are only deduplicated by `Node` object identity (`Map` semantics).
 * Distinct `Node` instances that represent the same YAML value will be emitted as duplicate
 * keys, producing invalid YAML.
 * @see https://yaml.org/spec/1.2.2/#3213-node-comparison
 * @see https://yaml.org/spec/1.2.2/#example-mapping-between-sequences
 */
export class Mapping extends Collection {
    /**
     * @inheritdoc
     * @override
     */
    static EMPTY_YAML = '{}';

    /**
     * Keys and values, as Node objects.
     *
     * @type {Map<Node, Node>}
     * @readonly
     */
    entries;

    /**
     * Create a mapping node.
     *
     * @param {Iterable<readonly [Node, Node]>} [entries] - Key/value node pairs.
     * @param {NodeOptions} [options] - Common node properties.
     */
    constructor(entries = [], options = {}) {
        super(options);

        this.entries = new Map(entries);
    }

    /**
     * @inheritdoc
     * @override
     */
    isEmpty() {
        return this.entries.size === 0;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options.
     * @protected
     */
    getItems(options) {
        return Array.from(
            this.entries,
            ([k, v]) => `${k.asKey(options)}${v.asValue(options)}`
        );
    }
}

/**
 * A YAML sequence node.
 *
 * @see https://yaml.org/spec/1.2.2/#821-block-sequences
 */
export class Sequence extends Collection {
    /**
     * @inheritdoc
     * @override
     */
    static EMPTY_YAML = '[]';

    /**
     * Items, as Node objects.
     *
     * @type {Node[]}
     * @readonly
     */
    items;

    /**
     * Create a sequence node.
     *
     * @param {Iterable<Node>} [items] - Sequence elements.
     * @param {NodeOptions} [options] - Common node properties.
     */
    constructor(items = [], options = {}) {
        super(options);

        this.items = Array.from(items);
    }

    /**
     * @inheritdoc
     * @override
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * @inheritdoc
     * @override
     * @param {Required<PresentationOptions>} options - Presentation options.
     * @protected
     */
    getItems(options) {
        return this.items.map(item => item.asItem(options));
    }
}
