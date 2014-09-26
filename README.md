# WhoaLife

An homage to the excellent, but short lived, OhLife daily diary system.

# Installation

This app is designed to be run on Heroku. You can run it elsewhere but you'll
need to have your own MongoDB instance and a way to run scheduled tasks.

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

Create an app on Heroku

    heroku create
    
Optionally rename the app to something you like

    heroku apps:rename YOUR_APP_NAME
    
Add the required plugins

    heroku addons:add mongohq
    heroku addons:add sendgrid
    heroku addons:add cloudmailin
    heroku addons:add scheduler
    
Set your email address

    heroku config:set EMAIL='YOUR_EMAIL_ADDRESS'
    
Set your full name
    
    heroku config:set NAME='YOUR_NAME'
    
Note the URL of your application. You will need it for the next command.

    heroku apps:info | grep 'Web URL'    
    
Set the URL for the application. This is the URL from the previous command. I
recommend changing the http to https for better security.

    heroku config:set WEB_ROOT='https://YOUR_APP_NAME.herokoapp.com'
    
Set your timezone. There is a list available at:
http://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     
    heroku config:set TZ='America/Los_Angeles'
    
Deploy the app

    git push heroku master
    
Look at the logs to get some important URLs
    
    
    
Add a scheduled task to send your daily email

    heroku addons:open scheduler
    
In the resulting dashboard, add a once daily task with the following command.

    curl -XPOST http://YOUR_APP_NAME.herokuapp.com/jobs/send
    
You should set the time of the task to run when you'd like to receive your
email. Make sure you take timezone into account.

# Running Locally

    npm start

# Authentication

Authentication is mostly transparent to the end user, so this section is really
just an explanation of how it works.

WhoaLife exposes a number of RESTful API endpoints, a /public directory
containing web resources and a /pkgs directory containing third party packages
used by the site.

All of the API resources are protected using a signed JSON Web Token. The token
is passed either as an Authorization: Bearer header or as a query parameter
such as ?jwt=token.

There is once exception to the above: Before the application has been configured
for the first time, the /settings API route is exposed. This allows the user
to perform the initial application configuration. Once the settings have
been saved one time the route is locked down as described above.

The /public and /pkgs directories are not authenticated at all and do not
expose any end user data. Only the API resources are capable of exposing end
user data.

A user is never required to "log in" using WhoaLife, and in fact there is no
method to do so. 

# TODO

* Create a setup.js that runs via Procfile: setup. It should print out a URL that can be used to access the site with auth and should print out the scheduler info.
* See if the email route is secure - it should be - and update docs and figure out cloudmailin endpoint.

The problem:
cloudmailin URL, needs web root, auth
scheduler URL, needs web root, auth
scheduler time, needs timezone, hour to send
timezone is needed for formatting dates
timezone selectable from a list is nice
