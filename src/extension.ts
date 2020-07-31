// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mcrl2-viewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mcrl2-viewer.preview', () => {

		// prepare files
		let filename = vscode.window.activeTextEditor?.document.fileName ?? "";
		if (filename === "") {
			vscode.window.showErrorMessage("Can not find the path of active file");
			return;
		}

		if (path.extname(filename) !== '.mcrl2') {
			vscode.window.showErrorMessage("Only mcrl2 file is supported");
			return;
		}

		// generate tmp
		let name = path.basename(filename, 'mcrl2');
		let tmpDot = path.join(os.tmpdir(), name + "dot");
		let tmpPng = path.join(os.tmpdir(), name + "png");

		// execute
		let cmd = `(mcrl22lps ${filename} | lps2lts - -o dot ${tmpDot} ) && dot ${tmpDot} -Tpng -o ${tmpPng}`;
		cp.exec(cmd, (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Failed to generate DOT file, error ${error.message}. Ensure tools added to PATH environment variable: mcrl22lps, lps2lts, dot`);
				return;
			}

			if (stderr) {
				console.warn(stderr);
			}
			
			if (stdout) {
				console.debug(stdout);
			}

			console.log(`Successfully created PNG file at ${tmpPng}`);

			// Display the PNG file to user
			let previewPanel = vscode.window.createWebviewPanel("mcrl2Preview", `Preview file '${path.basename(filename)}'`, vscode.ViewColumn.Beside, {
				enableScripts : false,
				localResourceRoots : [vscode.Uri.file(os.tmpdir())]
			});
			let vpath = previewPanel.webview.asWebviewUri(vscode.Uri.file(tmpPng));
			previewPanel.webview.html = `
			<!DOCTYPE html>
            <html lang="en">
            <head>
				<meta charset="UTF-8">
			</head>

			<body>
                <img src="${vpath}" />
            </body>
			</html>`;
			
			// delete file on closed
			previewPanel.onDidDispose(() => {
				try {
					fs.unlinkSync(tmpDot);
					fs.unlinkSync(tmpPng);
				} catch (err) {
					console.error('Failed to delete temp files: ' + err);	
				}
			});
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
