export function css(...entries: (string | false | undefined)[]): string {
    return entries.filter(x => !!x).join(" ");
}
