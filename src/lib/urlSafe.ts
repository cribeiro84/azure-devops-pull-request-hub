export function makeUrlSafe(input: string): string {
    input = input.replace(" ", "_");

    return encodeURIComponent(input);
}
