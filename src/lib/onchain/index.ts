

export const color = (_color: () => string, text: () => string) => {
    return () => {
        return `<p style="color:${_color()}">${text()}</p>`;
    }
};

export const backgroundColor = (_color: () => string, text: () => string) => {
    return () => {
        if (text().includes("<p")) {
            return text().replace("style=\"", "style=\"background-color:" + _color() + "; ");
        } else {
            return `<p style="background-color:${_color()}">${text()}</p>`;
        }
    }
};

export const concat = (_a: () => string, _b: () => string) => {
    return () => {
        return `${_a()}${_b()}`
    }
};

export const repeat = (_a: () => string, _b: () => number) => {
    return () => {
        let text = "";
        for (let i = 0; i < (_b() as number); i++) {
            text += _a();

        }
        return text;
    }
};

export const index = { color, concat, backgroundColor, repeat }
