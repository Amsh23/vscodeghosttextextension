const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "vscode") {
        return {
            Range: class Range {
                constructor(start, end) {
                    this.start = start;
                    this.end = end;
                }
            },
            InlineCompletionItem: class InlineCompletionItem {
                constructor(insertText, range) {
                    this.insertText = insertText;
                    this.range = range;
                }
            },
            window: {
                showErrorMessage() {},
                showInformationMessage() {}
            },
            languages: {
                registerInlineCompletionItemProvider() {
                    return { dispose() {} };
                }
            },
            commands: {
                registerCommand() {
                    return { dispose() {} };
                }
            }
        };
    }

    return originalLoad(request, parent, isMain);
};

const { getNextLineCompletion, normalizeCodes, setCodes } = require("../extension");

function createDocument(lines) {
    return {
        lineCount: lines.length,
        lineAt(index) {
            return { text: lines[index] };
        }
    };
}

test("normalizes code snippets safely", () => {
    const normalized = normalizeCodes({
        valid: ["first", "second"],
        empty: [],
        bad: "not-lines",
        mixed: ["ok", 1, null]
    });

    assert.deepEqual(normalized, {
        valid: ["first", "second"],
        mixed: ["ok"]
    });
});

test("suggests remaining text for a partially typed first line", () => {
    setCodes({ demo: ["import cv2", "print('ready')"] });

    assert.equal(
        getNextLineCompletion(createDocument(["import c"]), { line: 0, character: 8 }),
        "v2"
    );
});

test("suggests the next saved line after a complete line", () => {
    setCodes({ demo: ["import cv2", "print('ready')"] });

    assert.equal(
        getNextLineCompletion(createDocument(["import cv2"]), { line: 0, character: 10 }),
        "\nprint('ready')"
    );
});
