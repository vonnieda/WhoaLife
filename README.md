# WhoaLife

An homage to the excellent, but short lived, OhLife daily diary system.

WhoaLife will email you once a day and ask you how your day went. Just reply
to the email and your diary grows.

# Why

OhLife was one of my favorite apps on the web. Simple and concise, it did
exactly one thing and it did it incredibly well.

When they announced the shutdown of the site in September, 2014 I was crushed.
I'd been using it for 3 years and I still really enjoy using it. I decided as
soon as I got the email that I would make my own.

I make no claims of any type to the name or property of OhLife. This app was
written entirely from scratch over the course of a few nights. It's not nearly
as good as OhLife was, but it'll do. It'll do.

# Installation

This app is designed to be run on Heroku. You can run it elsewhere but you'll
need to have your own MongoDB instance and a way to run scheduled tasks.

WhoaLife is a single user application. It's just for you. If someone else wants
to use it they'll have to set up their own.

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

1. Create an app on Heroku

        heroku create
    
2. Optionally rename the app to something you like

        heroku apps:rename YOUR_APP_NAME
    
3. Add the required plugins

        heroku addons:add heroku-postgresql
        heroku addons:add sendgrid
        heroku addons:add cloudmailin
        heroku addons:add scheduler

4. Load the database schema

        heroku pg:psql -c 'create table entries (createdat timestamp with time zone, text text);'
    
5. Set your email address

        heroku config:set EMAIL='your@emailaddress.com'

6. Set your full name
    
        heroku config:set NAME='Your Name'
    
7. Note the URL of your application. You will need it for the next command.

        heroku apps:info | grep 'Web URL'    
    
8. Set the URL for the application. This is the URL from the previous command. I
recommend changing the http to https for better security.

        heroku config:set WEB_ROOT='https://YOUR_APP_NAME.herokoapp.com'
    
9. Set your timezone. There is a list available at:
http://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     
        heroku config:set TZ='America/Los_Angeles'
    
10. Deploy the app

        git push heroku master
    
11. Look at the logs to get some important URLs. You are looking for text like
the below. You'll need those URLs for the next two tasks.

        heroku logs --tail
        
    It may take a few minutes to appear, but look for this:        

        WhoaLife
    
        Scheduler Send Mail Command: curl -XPOST 'https://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@whoalife.herokuapp.com/jobs/send'
    
        Cloudmailin Target URL: https://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@whoalife.herokuapp.com/emails
    
12. Add a scheduled task to send your daily email

        heroku addons:open scheduler
    
    In the resulting dashboard, add a once daily task using the "Scheduler Send
    Mail Command" that you saw in your logs. It should look something like:

        curl -XPOST 'https://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@whoalife.herokuapp.com/jobs/send'
    
    You should set the time of the task to run when you'd like to receive your
    email. Make sure you take timezone into account.

13. Add your target send URL to Cloudmailin

        heroku addons:open cloudmailin
        
    In the resulting dashboard, click Edit Target and then add the "Cloudmailin
    Target URL" that you saw in your logs. It should look something like:
    
        https://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@whoalife.herokuapp.com/emails

    You can leave the default delivery option (Multipart) selected.
    
14. There is no step 14! Wasn't that easy?
    
    You should receive an email at the time you specified in your scheduler and
    from there you can just follow the instructions. If you ever want to see
    your old entries just click the link in the email.
    
    If you'd like to send a test email right now to make sure it's all working
    just paste your "Scheduler Send Mail Command" into your terminal and you
    should get an email within a few minutes.
    
    Enjoy!

# Running Locally

    npm start

# How It Works

WhoaLife is a simple Node.js application based on Express. It uses MongoDB for
data storage and a number of Heroku services to help it along. It only does
three things:

1. Sending a POST to /emails will record a new entry into the diary. WhoaLife
uses Cloudmailin to receive emails that you send. Cloudmailin parses the email
and POSTs it to /emails.

2. Sending a POST to /jobs/send will send you an email asking how your day
went. It uses Sendgrid to send the email and it uses Heroku's Scheduler addon
to trigger the send once a day.

3. Loading / in a browser will show you all your previous entries ordered by
date. That's it.

Authentication is handled using HTTPS basic auth. Each of the three routes
mentioned above require a signed JSON Web Token sent via basic auth. This is
done transparently to you. It's embedded in the link in the email for you to
view your diary and it's embedded in the URLs that you set up during
installation for the Scheduler and Cloudmailin.


