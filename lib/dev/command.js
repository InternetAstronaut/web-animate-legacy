// Command.js: A JSFL-like framework.

class Plugin {
    constructor(name, version) {
        // TODO: The implementation.
    }

    static onMenuBarAvaible() {
        this.addMenuBar({
            name: "Chuckle my Knuckles!",
            onClick: () => console.log("You Chuckle my Knuckles!"),
            children: [
                'Poop'
            ],

        })
    }
}
