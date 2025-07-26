{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = inputs:
    inputs.flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import (inputs.nixpkgs) { inherit system; });
      in {
        devShell = pkgs.mkShell {
          buildInputs= [
            pkgs.nodejs_22
            pkgs.nodePackages.pnpm
            pkgs.nodePackages.typescript
            pkgs.nodePackages.typescript-language-server
          ];
          shellHook = ''
                pnpm install
                clear
                if [ -f package.json ] && [ -f .env ]; then
                        echo "Running database migration..."
                        pnpm prisma migrate
                else 
                        echo "⚠️  .env file not found! Please copy env-example to .env and fill in your credentials."
                fi
          '';
        };
      }
    );
}
