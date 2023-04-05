#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const inquirer = require('inquirer');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);

(async () => {
    const packageJson = JSON.parse(await readFileAsync('./package.json', 'utf8'));
    const { version } = packageJson;

    const program = new Command();
    program
        .version(version)
        .option('-d, --destination <path>', 'destination path for the generated template structure', './')
        .parse(process.argv);

    const options = program.opts();
    const destination = options.destination;

    // Define the questions to ask the user
    const questions = [
        {
            type: 'input',
            name: 'packageName',
            message: 'Package name:',
            default: 'example-package',
        },
        {
            type: 'input',
            name: 'packageVersion',
            message: 'Package version:',
            default: '0.0.1',
        },
        {
            type: 'input',
            name: 'packageDescription',
            message: 'Package description:',
            default: 'An example NPM package',
        },
        {
            type: 'input',
            name: 'manifestName',
            message: 'Manifest name:',
            default: 'My SvelteKit PWA',
        },
        {
            type: 'input',
            name: 'manifestShortName',
            message: 'Manifest short name:',
            default: 'SvelteKit PWA',
        },
        {
            type: 'input',
            name: 'manifestDescription',
            message: 'Manifest description:',
            default: 'An example of a SvelteKit PWA',
        },
    ];

    // Prompt the user for input, then generate the template structure and install dependencies
    const answers = await inquirer.prompt(questions);
    await generateTemplateStructure(destination, answers);
    installDependencies(destination);
})();

async function generateTemplateStructure(destination, data) {
    const templatesDir = path.join(__dirname, 'templates');

    function walkTemplatesDir(currentPath) {
        const files = fs.readdirSync(currentPath);

        files.forEach((file) => {
            const filePath = path.join(currentPath, file);
            const relativePath = path.relative(templatesDir, filePath);

            if (fs.statSync(filePath).isDirectory()) {
                const newDestinationPath = path.join(destination, relativePath);
                fs.mkdirSync(newDestinationPath, { recursive: true });
                walkTemplatesDir(filePath);
            } else {
                const templatePath = filePath;
                const destinationPath = path.join(destination, relativePath.replace(/\.ejs$/, ''));
                generateFile(templatePath, destinationPath, data);
            }
        });
    }

    walkTemplatesDir(templatesDir);
}

async function generateFile(templatePath, destinationPath, data) {
    ejs.renderFile(templatePath, data, (err, result) => {
        if (err) {
            console.error(`Error rendering template: ${err.message}`);
            return;
        }

        fs.writeFile(destinationPath, result, (err) => {
            if (err) {
                console.error(`Error writing file: ${err.message}`);
            } else {
                console.log(`Generated: ${destinationPath}`);
            }
        });
    });
}

async function installDependencies(destination) {
    const spawn = require('child_process').spawn;
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    const npmInstall = spawn(npmCmd, ['install'], { cwd: destination, stdio: 'inherit' });

    npmInstall.on('close', (code) => {
        if (code !== 0) {
            console.error('Error: Failed to install dependencies.');
            process.exit(code);
        } else {
            console.log('Dependencies installed successfully.');
        }
    });
}