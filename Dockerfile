# A Docker image to run the jest tests
FROM iojs:3

WORKDIR /var/isomorphic-dispatcher/

COPY ./src /var/isomorphic-dispatcher/src/
COPY ./__tests__ /var/isomorphic-dispatcher/__tests__/
COPY ./jestEnvironment.js /var/isomorphic-dispatcher/
COPY ./package.json /var/isomorphic-dispatcher/
RUN npm install

CMD npm test
