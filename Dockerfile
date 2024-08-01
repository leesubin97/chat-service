FROM nginx:alpine-slim

WORKDIR /app

COPY ./dist ./
COPY ./nginx/default.conf /etc/nginx/templates/default.conf.template

EXPOSE 3000

CMD [ "nginx", "-g", "daemon off;" ]
