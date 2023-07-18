export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const decodeBody = (base64String: string) => {
    console.log('decoding body...');
    // const decodedBody = Buffer.from(base64String, 'base64').toString('utf-8');
    return JSON.parse(base64String);
};
export const encodeBody = (obj: any) => {
    const encodedBody = Buffer.from(JSON.stringify(obj)).toString('base64');
    console.log(encodedBody); // Outputs: eyJ0ZXN0IjoiYm9keSJ9
    return encodedBody;
};
