export function random_number(min: number, max: number, decimals?: number): number {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
}
export function shuffle_array(array: any[]): void {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
