# WhoaLife

An homage to the excellent, but short lived, OhLife daily diary system.

# Installation

This app is designed to be run on Heroku. You can run it elsewhere but you'll
need to have your own MongoDB instance and a way to run scheduled tasks.

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

1. Create an app on Heroku

        heroku create
    
2. Optionally rename the app to something you like

        heroku apps:rename YOUR_APP_NAME
    
3. Add the required plugins

        heroku addons:add mongohq
        heroku addons:add sendgrid
        heroku addons:add cloudmailin
        heroku addons:add scheduler
    
4. Set your email address

        heroku config:set EMAIL='YOUR_EMAIL_ADDRESS'
    
5. Set your full name
    
        heroku config:set NAME='YOUR_NAME'
    
6. Note the URL of your application. You will need it for the next command.

        heroku apps:info | grep 'Web URL'    
    
7. Set the URL for the application. This is the URL from the previous command. I
recommend changing the http to https for better security.

        heroku config:set WEB_ROOT='https://YOUR_APP_NAME.herokoapp.com'
    
8. Set your timezone. There is a list available at:
http://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     
        heroku config:set TZ='America/Los_Angeles'
    
9. Deploy the app

        git push heroku master
    
10. Look at the logs to get some important URLs. You are looking for text like
the below. You'll need those URLs for the next two tasks.

        WhoaLife
    
        Scheduler Send Mail Command: curl -XPOST 'http://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@localhost:3000/jobs/send'
    
        Cloudmailin Target URL: http://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@localhost:3000/emails
    
11. Add a scheduled task to send your daily email

        heroku addons:open scheduler
    
    In the resulting dashboard, add a once daily task using the "Scheduler Send
    Mail Command" that you saw in your logs. It should look something like:

        curl -XPOST 'http://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@localhost:3000/jobs/send'
    
    You should set the time of the task to run when you'd like to receive your
    email. Make sure you take timezone into account.

12. Add your target send URL to Cloudmailin

        heroku addons:open cloudmailin
        
    In the resulting dashboard, click Edit Target and then add the "Cloudmailin
    Target URL" that you saw in your logs. It should look something like:
    
        http://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@localhost:3000/emails

    You can leave the default delivery option (Multipart) selected.
    
13. There is no step 13! Wasn't that easy?
    
    You should receive an email at the time you specified in your scheduler and
    from there you can just follow the instructions. If you ever want to see
    your old entries just click the link in the email.
    
    If you'd like to send a test email right now to make sure it's all working
    just paste your "Scheduler Send Mail Command" into your terminal and you
    should get an email within a few minutes.
    
    Enjoy!

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
