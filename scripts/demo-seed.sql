-- Sample data for `npm run demo`. Companies are made up; nothing here is a
-- real posting. Lets you show the tracker without API keys.
DELETE FROM postings;
INSERT INTO postings (dedupe_key, source, source_id, company, title, location, url, description, closes_at, score, score_reasons, score_red_flags, stage) VALUES
('d1','greenhouse','d1','Palmetto Civil Partners','Transportation Engineering Intern – Summer 2027','Greenville, SC','https://example.com/1','',NULL,9,
 '["Transportation is your first-listed interest and the role is roadway design","Open to rising juniors, which matches a May 2029 graduation","Greenville is inside your South Carolina preference"]','[]','found'),
('d2','usajobs','d2','U.S. Army Corps of Engineers','Student Trainee (Civil Engineering)','Charleston, SC','https://example.com/2','','2026-10-30',8,
 '["Pathways internship in the civil engineering series (0810)","Hydraulic work lines up with your water resources interest"]','["Application closes Oct 30"]','found'),
('d3','lever','d3','Blue Ridge Water Group','Engineering Co-op (Water Resources)','Asheville, NC','https://example.com/3','',NULL,8,
 '["Stormwater and drainage design match your water resources interest","North Carolina is on your relocation list"]','["Co-op means a semester off campus"]','applied'),
('d4','greenhouse','d4','Lowcountry Site Design','Land Development Intern','Charleston, SC','https://example.com/4','',NULL,7,
 '["Site development is one of your listed interests","Civil 3D experience preferred, which you have not used yet"]','["Prefers Civil 3D experience"]','interview'),
('d5','lever','d5','Piedmont Geotechnical','Field Technician Intern','Charlotte, NC','https://example.com/5','',NULL,5,
 '["Geotechnical field testing is civil but not one of your listed interests","Good fit for field data collection skills"]','["Requires a valid driver''s license and travel to job sites"]','found'),
('d6','greenhouse','d6','Gulf Coast Structures','Structural Engineering Intern','Houston, TX','https://example.com/6','',NULL,4,
 '["Structural design is outside your listed interests","Texas is outside your relocation preferences"]','[]','found'),
('d7','greenhouse','d7','Peachtree Infrastructure','Graduate Engineering Intern','Atlanta, GA','https://example.com/7','',NULL,2,
 '["Requires a completed bachelor''s degree, so you are not eligible yet"]','["Requires a completed B.S. in Civil Engineering"]','found'),
('d8','lever','d8','Upstate Transit Authority','Civil Engineering Intern (Traffic Operations)','Spartanburg, SC','https://example.com/8','',NULL,NULL,NULL,NULL,'found');
