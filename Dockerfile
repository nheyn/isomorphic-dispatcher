# A Docker image to run the jest tests
FROM node:4

WORKDIR /sbin/isomorphic-dispatcher/

COPY ./src /sbin/isomorphic-dispatcher/src/
COPY ./__tests__ /sbin/isomorphic-dispatcher/__tests__/
COPY ./package.json /sbin/isomorphic-dispatcher/
RUN npm install

CMD npm test
