const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const MAX_SAVED_LINES = 500;
const MAX_SAVED_LINE_LENGTH = 1000;

let codes = {};
let matchEntries = [];

function normalizeCodes(rawCodes) {
    if (!rawCodes || typeof rawCodes !== "object" || Array.isArray(rawCodes)) {
        throw new Error("codes.json must contain an object of trigger-to-lines entries.");
    }

    const normalized = {};

    for (const [trigger, savedLines] of Object.entries(rawCodes)) {
        if (!Array.isArray(savedLines)) {
            continue;
        }

        const safeLines = savedLines
            .filter((line) => typeof line === "string")
            .slice(0, MAX_SAVED_LINES)
            .map((line) => line.slice(0, MAX_SAVED_LINE_LENGTH));

        if (safeLines.length === 0) {
            continue;
        }

        normalized[trigger] = safeLines;
    }

    return normalized;
}

function buildMatchEntries(normalizedCodes) {
    return Object.entries(normalizedCodes)
        .map(([trigger, lines]) => ({ trigger, lines }))
        .sort((a, b) => b.lines[0].length - a.lines[0].length);
}

function setCodes(rawCodes) {
    codes = normalizeCodes(rawCodes);
    matchEntries = buildMatchEntries(codes);
}

function loadCodes(context) {
    const filePath = path.join(context.extensionPath, "codes.json");

    try {
        const text = fs.readFileSync(filePath, "utf8");
        setCodes(JSON.parse(text));

        return true;
    } catch (error) {
        codes = {};
        matchEntries = [];

        vscode.window.showErrorMessage(`My Ghost Code: ${error.message}`);

        return false;
    }
}

function getLinePrefix(document, position) {
    const line = document.lineAt(position.line);

    return line.text.substring(0, position.character);
}

function getRelevantDocumentLines(document, position, maxLines) {
    const lines = [];
    const start = Math.max(0, position.line - maxLines + 1);

    for (let i = start; i <= position.line; i++) {
        lines.push({ index: i, text: document.lineAt(i).text });
    }

    return lines;
}

function findSavedCode(document, position) {
    const currentLinePrefix = getLinePrefix(document, position);
    const maxSavedLines = matchEntries.reduce(
        (max, entry) => Math.max(max, entry.lines.length),
        1
    );
    const relevantDocumentLines = getRelevantDocumentLines(
        document,
        position,
        maxSavedLines
    );

    for (const { lines: savedLines } of matchEntries) {
        const firstLine = savedLines[0];

        if (currentLinePrefix === firstLine || firstLine.startsWith(currentLinePrefix)) {
            return {
                lines: savedLines,
                currentIndex: 0,
                typed: currentLinePrefix
            };
        }

        for (const { index: start, text } of relevantDocumentLines) {
            if (text !== firstLine) {
                continue;
            }

            let lastMatchedIndex = 0;

            for (let j = 1; j < savedLines.length; j++) {
                const documentIndex = start + j;

                if (documentIndex > position.line) {
                    break;
                }

                const documentLine = document.lineAt(documentIndex).text;
                const savedLine = savedLines[j];

                if (documentIndex === position.line) {
                    if (!savedLine.startsWith(currentLinePrefix)) {
                        lastMatchedIndex = -1;
                    } else {
                        lastMatchedIndex = j;
                    }
                    break;
                }

                if (documentLine !== savedLine) {
                    lastMatchedIndex = -1;
                    break;
                }

                lastMatchedIndex = j;
            }

            if (lastMatchedIndex >= 0) {
                return {
                    lines: savedLines,
                    currentIndex: lastMatchedIndex,
                    typed: currentLinePrefix
                };
            }
        }
    }

    return null;
}

function getNextLineCompletion(document, position) {
    const result = findSavedCode(document, position);

    if (!result) {
        return null;
    }

    const currentLine = result.lines[result.currentIndex];

    if (result.typed === currentLine) {
        const nextIndex = result.currentIndex + 1;

        if (nextIndex >= result.lines.length) {
            return null;
        }

        return `\n${result.lines[nextIndex]}`;
    }

    if (currentLine.startsWith(result.typed)) {
        return currentLine.slice(result.typed.length);
    }

    return null;
}

function activate(context) {
    loadCodes(context);

    const provider = {
        provideInlineCompletionItems(document, position, inlineContext, token) {
            if (token.isCancellationRequested) {
                return { items: [] };
            }

            const completion = getNextLineCompletion(document, position);

            if (!completion) {
                return { items: [] };
            }

            const range = new vscode.Range(position, position);
            const item = new vscode.InlineCompletionItem(completion, range);

            return { items: [item] };
        }
    };

    const providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
        [{ scheme: "file" }, { scheme: "untitled" }],
        provider
    );

    context.subscriptions.push(providerDisposable);

    const reloadCommand = vscode.commands.registerCommand(
        "my-ghost-code.reloadCodes",
        () => {
            if (loadCodes(context)) {
                vscode.window.showInformationMessage("My Ghost Code: codes.json reloaded.");
            }
        }
    );

    context.subscriptions.push(reloadCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    getNextLineCompletion,
    normalizeCodes,
    setCodes
};
