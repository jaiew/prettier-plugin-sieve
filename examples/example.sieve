require ["fileinto","reject","vacation","imap4flags"];
# Main routing rules
if anyof(header :contains "Subject" "URGENT",address :is "From" "boss@example.com"){fileinto "Priority";}
elsif allof (header :contains "X-Spam-Flag" "YES", size :over 100) {
discard;
} elsif header:contains "Subject" "[Newsletter]"{fileinto "Newsletters";}
else{
keep;
}
