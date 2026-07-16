ARG BASE_CONTAINER=docker.io/node:22

FROM $BASE_CONTAINER AS final-hour-dev

ARG USER=node

LABEL org.opencontainers.image.authors="mikey@blindcomputing.org"

EXPOSE 13000/udp
VOLUME /home/node/app/maps
RUN mkdir -p /home/node/app
WORKDIR /home/node

RUN --mount=type=bind,source=package.json,target=/home/node/package.json \
    --mount=type=bind,source=package-lock.json,target=/home/node/package-lock.json \
    npm ci && \
    sed -i 's/"use asm";//' /home/node/node_modules/enet/build/enet.js

WORKDIR /home/node/app

ENTRYPOINT ["npm", "run"]
CMD ["dev"]

FROM final-hour-dev AS final-hour-prod

ENV NODE_PATH=./dist
CMD ["start"]

COPY --chown=node . /home/node/app
RUN chown -R node /home/node/app
RUN npm run build
USER $USER