## About

GitHub Action to containerize and push Bento images with
[Buildx](https://github.com/docker/buildx) with support features provided by
[Moby BuildKit](https://github.com/moby/buildkit) builder toolkit.

This is the equivalent of
[`docker/build-push-action`](https://github.com/docker/build-push-action) but
for running Bento containerization (since BentoML's containerize does have
Buildx support)

> [!IMPORTANT] 
> This implementation is largely based on
> [`docker/build-push-action`](https://github.com/docker/build-push-action)
> See their [README.md](https://github.com/docker/build-push-action) 
> for more advanced use cases.

```yaml
name: ci
on:
  push:
    branches:
      - 'main'
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: bentoml/setup-bentoml-action@v1
        with:
          python-version: '3.10'
          bentoml-version: 'main'
          cache: 'pip'
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build Bento
        run: bentoml build 
      - name: Build and push
        uses: bentoml/containerize-push-action@v1
        with:
          bento-tag: my-bento:latest
          push: true
          tags: user/app:latest
```
