# External engines

This directory contains unmodified third-party engine binaries and model files used by `chessgame`.
Each game falls back to its built-in C++ robot when an external engine cannot be started.

- `zhongguoxiangqi`: Pikafish binary and NNUE supplied with the original completed Chinese-chess project.
- `guojixiangqi`: Stockfish 18, official Windows x64 AVX2 binary. License: GNU GPL v3 (`Copying.txt`). Source: https://github.com/official-stockfish/Stockfish/tree/sf_18
- `weiqi`: KataGo 1.16.5 Eigen AVX2 binary with network `kata1-b28c512nbt-s13255194368-d5935380940`. License: MIT plus bundled third-party components (`LICENSE`, `README.txt`). Source: https://github.com/lightvector/KataGo/tree/v1.16.5
- `wuziqi`: Rapfi release 250615 AVX2 binary with official Mix9Svq NNUE weights. License: GNU GPL v3 (`Copying.txt`). Source: https://github.com/dhbloo/rapfi/tree/250615

The binary choices target 64-bit Windows processors with AVX2 support. The project itself remains usable through built-in fallback robots if a target computer cannot execute a bundled binary.
