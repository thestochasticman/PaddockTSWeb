This is the web interface for the [PaddockTS](https://github.com/thestochasticman/paddock-ts-local) python package.





## Deployment

Prior to running this, start the the caddy container in [borevitz_projects_caddy](https://github.com/thestochasticman/borevitz_projects_caddy)

make sure the the network 'edge' has been created. 

```
sudo docker network ls --filter name=^edge$ --format '{{.Name}}'
[sudo] password for yasar: 
edge
```
If not created(You dont get 'edge' as an output)
```
sudo docker network create edge
```

```
sudo docker compose build frontend
sudo docker compose build frontend
```

```
sudo docker compose up backend

sudo docker compose up frontend
```

View the website on http://130.56.246.157/PaddockTS
## Frontend

A fairly simple UI which gives the user an access to input their chosen
values for the geographical area they are interested in. Built using typescript and next.js.


- **`compose.yml`**  
  Defines `frontend` service (built from `frontend/Dockerfile`) and passes `NEXT_PUBLIC_API_URL` and `NEXT_BASEPATH` as **build args**. Both services attach to an external Docker network named `edge`. 



## Quick dev/run notes (frontend)

- **Local development** (inside `frontend/`):  
  ```bash
  npm install
  npm run dev
  ```
  Ensure `NEXT_PUBLIC_API_URL` is set appropriately (e.g., `/api` or `http://localhost:8000`).





## Shutting Down

```
sudo docker compose down backend

sudo docker compose down frontend 
```