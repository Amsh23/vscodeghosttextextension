const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let codes = {};

function loadCodes(context) {
    const filePath = path.join(context.extensionPath, "codes.json");

    try {
        const text = fs.readFileSync(filePath, "utf8");
        codes = JSON.parse(text);

        if (!codes || typeof codes !== "object") {
            throw new Error("Invalid codes.json");
        }

        return true;
    } catch (error) {
        codes = {};

        vscode.window.showErrorMessage(
            `My Ghost Code: ${error.message}`
        );

        return false;
    }
}

function getLinePrefix(document, position) {
    const line = document.lineAt(position.line);

    return line.text.substring(
        0,
        position.character
    );
}

function getDocumentLines(document) {
    const lines = [];

    for (let i = 0; i < document.lineCount; i++) {
        lines.push(document.lineAt(i).text);
    }

    return lines;
}

function findSavedCode(document, position) {
    const allDocumentLines =
        getDocumentLines(document);

    const currentLinePrefix =
        getLinePrefix(document, position);

    for (const trigger of Object.keys(codes)) {
        const savedLines = codes[trigger];

        if (!Array.isArray(savedLines)) {
            continue;
        }

        if (savedLines.length === 0) {
            continue;
        }

        /*
         * Find the first line of the saved code.
         */
        const firstLine = savedLines[0];

        /*
         * The current line may be the first line.
         */
        if (currentLinePrefix === firstLine) {
            return {
                lines: savedLines,
                currentIndex: 0,
                typed: currentLinePrefix
            };
        }

        /*
         * User may have typed only part of the first line.
         */
        if (
            firstLine.startsWith(
                currentLinePrefix
            )
        ) {
            return {
                lines: savedLines,
                currentIndex: 0,
                typed: currentLinePrefix
            };
        }

        /*
         * Look through the document to find
         * how many saved lines the user has already typed.
         */
        for (
            let start = 0;
            start < allDocumentLines.length;
            start++
        ) {
            if (
                allDocumentLines[start] !==
                firstLine
            ) {
                continue;
            }

            let matched = true;
            let lastMatchedIndex = 0;

            for (
                let j = 1;
                j < savedLines.length;
                j++
            ) {
                const documentIndex =
                    start + j;

                if (
                    documentIndex >=
                    allDocumentLines.length
                ) {
                    matched = false;
                    break;
                }

                const documentLine =
                    allDocumentLines[
                        documentIndex
                    ];

                const savedLine =
                    savedLines[j];

                /*
                 * For the current line,
                 * only compare what the user
                 * has typed so far.
                 */
                if (
                    documentIndex === position.line
                ) {
                    if (
                        !savedLine.startsWith(
                            currentLinePrefix
                        )
                    ) {
                        matched = false;
                        break;
                    }

                    lastMatchedIndex = j;
                    break;
                }

                /*
                 * Previous lines must match exactly.
                 */
                if (
                    documentLine !== savedLine
                ) {
                    matched = false;
                    break;
                }

                lastMatchedIndex = j;
            }

            if (matched) {
                return {
                    lines: savedLines,
                    currentIndex:
                        lastMatchedIndex,
                    typed:
                        currentLinePrefix
                };
            }
        }
    }

    return null;
}

function getNextLineCompletion(
    document,
    position
) {
    const result =
        findSavedCode(
            document,
            position
        );

    if (!result) {
        return null;
    }

    const currentLine =
        result.lines[
            result.currentIndex
        ];

    /*
     * If the current line is already completely typed,
     * suggest the next line.
     */
    if (
        result.typed === currentLine
    ) {
        const nextIndex =
            result.currentIndex + 1;

        if (
            nextIndex >=
            result.lines.length
        ) {
            return null;
        }

        return (
            "\n" +
            result.lines[nextIndex]
        );
    }

    /*
     * User has typed only part of the current line.
     * Suggest only the remaining characters.
     */
    if (
        currentLine.startsWith(
            result.typed
        )
    ) {
        return currentLine.slice(
            result.typed.length
        );
    }

    return null;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    loadCodes(context);

    const provider = {
        provideInlineCompletionItems(
            document,
            position,
            inlineContext,
            token
        ) {
            if (
                token.isCancellationRequested
            ) {
                return {
                    items: []
                };
            }

            const completion =
                getNextLineCompletion(
                    document,
                    position
                );

            if (!completion) {
                return {
                    items: []
                };
            }

            /*
             * ZERO WIDTH RANGE.
             *
             * Nothing is inserted automatically.
             *
             * VS Code displays the text
             * as real inline ghost text.
             */
            const range =
                new vscode.Range(
                    position,
                    position
                );

            const item =
                new vscode.InlineCompletionItem(
                    completion,
                    range
                );

            return {
                items: [item]
            };
        }
    };

    const providerDisposable =
        vscode.languages.registerInlineCompletionItemProvider(
            [
                {
                    scheme: "file"
                },
                {
                    scheme: "untitled"
                }
            ],
            provider
        );

    context.subscriptions.push(
        providerDisposable
    );

    const reloadCommand =
        vscode.commands.registerCommand(
            "my-ghost-code.reloadCodes",
            () => {
                if (loadCodes(context)) {
                    vscode.window.showInformationMessage(
                        "My Ghost Code: codes.json reloaded."
                    );
                }
            }
        );

    context.subscriptions.push(
        reloadCommand
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};