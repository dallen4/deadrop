import type { FileWithPath } from '@mantine/dropzone';

export const readFileAsBuffer = async (file: FileWithPath) => {
    const readFileOperation = new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = (event) => resolve(event.target!.result! as ArrayBuffer);
        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });

    const fileBuffer = await readFileOperation;

    return new Uint8Array(fileBuffer);
};

export const downloadFile = (file: File) => {
    const objectUrl = window.URL.createObjectURL(file);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.name;
    link.hidden = true;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};
