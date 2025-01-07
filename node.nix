## ACCESS updated nodejs version without vm
## You can dev the frontend without the backend just for testing
## You might need to change the path that is set in shellHook
## RUN : nix-shell setup_scripts/shell/frontend.nix

with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "node";
    buildInputs = [
        nodejs
    ];
    shellHook = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
        npm install
    '';
}
