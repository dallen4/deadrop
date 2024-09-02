import { DropMessage } from '@shared/types/messages';

export const readFileAsBuffer = async (file: File) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = (event) =>
            resolve(event.target!.result! as ArrayBuffer);
        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });

export const buildFileFromBuffer = (
    fileBuffer: ArrayBuffer,
    meta: NonNullable<DropMessage['meta']>,
) =>
    new File([fileBuffer], meta!.name, {
        type: meta!.type,
    });

export const downloadFile = (file: File) => {
    const objectUrl = (window.URL || window.webkitURL).createObjectURL(file);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.name;
    link.hidden = true;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};
