@echo off
setlocal

if "%LISTCOLLAB_ENV_FILE%"=="" set "LISTCOLLAB_ENV_FILE=C:\listcollab\listcollab.env"

if not exist "%LISTCOLLAB_ENV_FILE%" (
	echo Expected production env file at %LISTCOLLAB_ENV_FILE%
	exit /b 1
)

docker compose --env-file "%LISTCOLLAB_ENV_FILE%" -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose --env-file "%LISTCOLLAB_ENV_FILE%" -f docker-compose.prod.yml ps
