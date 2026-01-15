export function colorBetweenColors(
    color1: number = 0xffffff,
    color2: number = 0x000000,
    percent: number = 0.5,
) {
    if (percent < 0) percent = 0;
    if (percent > 1) percent = 1;

    var r = color1 >> 16;
    var g = (color1 >> 8) & 0xff;
    var b = color1 & 0xff;

    r += ((color2 >> 16) - r) * percent;
    g += (((color2 >> 8) & 0xff) - g) * percent;
    b += ((color2 & 0xff) - b) * percent;

    return (r << 16) | (g << 8) | b;
}
