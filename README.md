# WhoaLife

WhoaLife is a private daily diary that emails you once a day to ask
you how your day went. Just reply to the email and the diary entry is saved. You can
see all your entries by clicking the link in the email, and you get to see
one of your older entries in each email.

WhoaLife is an homage to the excellent, but short lived, OhLife daily diary system.

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

WhoaLife is a single user application that runs for free on Heroku. It's just
for you. If someone else wants to use it they'll have to set up their own.

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

1. Deploy WhoaLife to your Heroku account

    [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
    
2. Fill out the Heroku deployment form and start the deploy. 

    When it's finished, click Manage.

3. In the More menu, select View logs

4. Look at the logs to get some important URLs. You are looking for text like
the below. You'll need those URLs for the next two tasks.

        WhoaLife
    
        Scheduler Send Mail Command: curl -XPOST 'https://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@whoalife.herokuapp.com/jobs/send'
    
        Cloudmailin Target URL: https://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@whoalife.herokuapp.com/emails
    
5. On your Heroku app dashboard's Resources tab, open the Scheduler addon.

    In the resulting dashboard, add a once daily task using the "Scheduler Send
    Mail Command" that you saw in your logs. It should look something like:

        curl -XPOST 'https://a:eyJ0eXAi9287349182374iOiJIUzI1NiJ9.eyJpYXQi987349238742NDZ9.8fzBdgMY9o798172918723E68F8fZNMSE5GLRiLg7fzI@whoalife.herokuapp.com/jobs/send'
    
    You should set the time of the task to run when you'd like to receive your
    email. Make sure you take timezone into account.

6. On your Heroku app dashboard's Resources tab, open the Cloudmailin addon.

    In the resulting dashboard, click Edit Target and then add the "Cloudmailin
    Target URL" that you saw in your logs. It should look something like:
    
        https://a:eyJ0eXAi98132749128374hbGciOiJIUzI1NiJ9.eyJpYXQi981273918723NDZ9.8fzBdgMY9o7OOe9So1981273918723E5GLRiLg7fzI@whoalife.herokuapp.com/emails

    Set the POST Format to "JSON Format (older)".

7. On your Heroku app dashboard's Resources tab, open the Mailgun addon.

    In the resulting dashboard, select the Sending menu, and within that select the
    Overview menu. Here, you'll find an *Authorized Recipients* dialog; enter in the
    email address you want mails to be sent to, and click "Save Recipient". Mailgun
    will then send a confirmation email to that address, so be sure to approve that.

8. There is no step 8! Wasn't that easy?
    
    You should receive an email at the time you specified in your scheduler and
    from there you can just follow the instructions. If you ever want to see
    your old entries just click the link in the email.
    
    If you'd like to send a test email right now to make sure it's all working
    just paste your "Scheduler Send Mail Command" into your terminal and you
    should get an email within a few minutes.
    
    Enjoy!

# Running Locally

    heroku config -s > .env
    npm start

# How It Works

WhoaLife is a simple Node.js application based on Express. It uses Postgres for
data storage and a number of Heroku services to help it along. It only does
three things:

1. Sending a POST to /emails will record a new entry into the diary. WhoaLife
uses Cloudmailin to receive emails that you send. Cloudmailin parses the email
and POSTs it to /emails.

2. Sending a POST to /jobs/send will send you an email asking how your day
went. It uses Mailgun to send the email and it uses Heroku's Scheduler addon
to trigger the send once a day.

3. Loading / in a browser will show you all your previous entries ordered by
date. That's it.

Authentication is handled using HTTPS basic auth. Each of the three routes
mentioned above require a signed JSON Web Token sent via basic auth. This is
done transparently to you. It's embedded in the link in the email for you to
view your diary and it's embedded in the URLs that you set up during
installation for the Scheduler and Cloudmailin.


