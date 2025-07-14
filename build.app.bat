@cd /d %~dp0
pushd .

call npm install
call npm run package:win

cd arxiview

call npm install
call npm run dist:win

popd
